using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public sealed class WindowsPty : IDisposable {
    [StructLayout(LayoutKind.Sequential)] struct Coord {public short X,Y;}
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup {
        public int Size;public string Reserved,Desktop,Title;
        public int X,Y,Width,Height,CharsX,CharsY,Fill,Flags;
        public short Show,ReservedSize;public IntPtr ReservedPtr,Input,Output,Error;
    }
    [StructLayout(LayoutKind.Sequential)] struct StartupEx {public Startup Info;public IntPtr Attributes;}
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {public IntPtr Process,Thread;public uint ProcessId,ThreadId;}
    [DllImport("kernel32.dll",SetLastError=true)]static extern bool CreatePipe(out IntPtr read,out IntPtr write,IntPtr security,int size);
    [DllImport("kernel32.dll")]static extern int CreatePseudoConsole(Coord size,IntPtr input,IntPtr output,uint flags,out IntPtr console);
    [DllImport("kernel32.dll")]static extern void ClosePseudoConsole(IntPtr console);
    [DllImport("kernel32.dll",SetLastError=true)]static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
    [DllImport("kernel32.dll",SetLastError=true)]static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
    [DllImport("kernel32.dll")]static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcess(string app,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string cwd,ref StartupEx startup,out ProcessInfo process);
    [DllImport("kernel32.dll")]static extern bool ReadFile(IntPtr h,byte[] data,int size,out int count,IntPtr overlapped);
    [DllImport("kernel32.dll")]static extern bool WriteFile(IntPtr h,byte[] data,int size,out int count,IntPtr overlapped);
    [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint milliseconds);
    [DllImport("kernel32.dll")]static extern bool TerminateProcess(IntPtr h,uint exitCode);
    [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")]static extern bool FreeConsole();
    [DllImport("kernel32.dll")]static extern bool AttachConsole(uint pid);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
    [StructLayout(LayoutKind.Explicit,Size=20)] struct MouseRecord {
        [FieldOffset(0)]public ushort Type;
        [FieldOffset(4)]public Coord Position;
        [FieldOffset(8)]public uint Buttons;
        [FieldOffset(12)]public uint Controls;
        [FieldOffset(16)]public uint Flags;
    }
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool WriteConsoleInputW(IntPtr h,MouseRecord[] records,uint count,out uint written);
    IntPtr input,output,console,attributes;ProcessInfo child;
    StringBuilder received=new StringBuilder();Thread reader;
    char[,] screen=new char[30,80];int row=0,column=0;string pending="";
    DateTime lastOutput=DateTime.MinValue;
    public WindowsPty(string node,string script) {
        IntPtr inRead,outWrite;Check(CreatePipe(out inRead,out input,IntPtr.Zero,0));Check(CreatePipe(out output,out outWrite,IntPtr.Zero,0));
        int result=CreatePseudoConsole(new Coord{X=80,Y=30},inRead,outWrite,0,out console);CloseHandle(inRead);CloseHandle(outWrite);if(result!=0)throw new Exception("CreatePseudoConsole: "+result);
        IntPtr size=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);attributes=Marshal.AllocHGlobal(size);Check(InitializeProcThreadAttributeList(attributes,1,0,ref size));
        Check(UpdateProcThreadAttribute(attributes,0,new IntPtr(0x20016),console,new IntPtr(IntPtr.Size),IntPtr.Zero,IntPtr.Zero));
        StartupEx startup=new StartupEx();startup.Info.Size=Marshal.SizeOf(typeof(StartupEx));startup.Attributes=attributes;
        Check(CreateProcess(node,new StringBuilder("\""+node+"\" \""+script+"\""),IntPtr.Zero,IntPtr.Zero,false,0x80000,IntPtr.Zero,null,ref startup,out child));
        reader=new Thread(delegate(){byte[] data=new byte[8192];char[] chars=new char[8192];var decoder=Encoding.UTF8.GetDecoder();int count;while(ReadFile(output,data,data.Length,out count,IntPtr.Zero)&&count>0){int length=decoder.GetChars(data,0,count,chars,0);string text=new string(chars,0,length);lock(received){received.Append(text);Apply(text);lastOutput=DateTime.UtcNow;}}});reader.IsBackground=true;reader.Start();
    }
    static void Check(bool value){if(!value)throw new Exception("Win32 error "+Marshal.GetLastWin32Error());}
    public void Send(string text){byte[] bytes=Encoding.UTF8.GetBytes(text);int count;Check(WriteFile(input,bytes,bytes.Length,out count,IntPtr.Zero));}
    public void Mouse(short x,short y,uint button){
        // Inject real Win32 mouse records, as delivered to the native adapter.
        // Literal X10 packets sent to ConPTY can become keyboard characters.
        FreeConsole();Check(AttachConsole(child.ProcessId));
        IntPtr h=CreateFile("CONIN$",0xc0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
        try{var records=new[]{new MouseRecord{Type=2,Position=new Coord{X=(short)(x-1),Y=(short)(y-1)},Buttons=button},new MouseRecord{Type=2,Position=new Coord{X=(short)(x-1),Y=(short)(y-1)},Buttons=0}};uint written;Check(WriteConsoleInputW(h,records,2,out written));}
        finally{CloseHandle(h);FreeConsole();}
    }
    public string Output {get{lock(received)return received.ToString();}}
    public int Mark {get{return Output.Length;}}
    // Assert the visible terminal contents: differential redraws may send just
    // the changed 'O' in 'O navbati', keeping the rest of the previous label.
    void Apply(string text){
        pending+=text;int i=0;
        while(i<pending.Length){
            char ch=pending[i];
            if(ch=='\x1b'){
                if(i+1>=pending.Length)break;
                if(pending[i+1]=='['){
                    int end=i+2;while(end<pending.Length&&(pending[end]<'@'||pending[end]>'~'))end++;
                    if(end==pending.Length)break;
                    string raw=pending.Substring(i+2,end-i-2);char op=pending[end];
                    string[] parts=raw.TrimStart('?').Split(';');int a=0,b=0;int.TryParse(parts[0],out a);if(parts.Length>1)int.TryParse(parts[1],out b);
                    int n=a==0?1:a;
                    if(op=='H'||op=='f'){row=Math.Max(0,Math.Min(29,n-1));column=Math.Max(0,Math.Min(79,(b==0?1:b)-1));}
                    else if(op=='A')row=Math.Max(0,row-n);else if(op=='B')row=Math.Min(29,row+n);
                    else if(op=='C')column=Math.Min(79,column+n);else if(op=='D')column=Math.Max(0,column-n);
                    else if(op=='G')column=Math.Min(79,n-1);else if(op=='d')row=Math.Min(29,n-1);
                    else if(op=='J'&&a==2)Array.Clear(screen,0,screen.Length);
                    else if(op=='K')for(int c=a==2?0:column;c<80;c++)screen[row,c]=' ';
                    else if(op=='X')for(int c=column;c<Math.Min(80,column+n);c++)screen[row,c]=' ';
                    i=end+1;continue;
                }
                if(pending[i+1]==']'){
                    int end=i+2;while(end<pending.Length&&pending[end]!='\a'&&pending[end]!='\x1b')end++;
                    if(end==pending.Length)break;i=end+(pending[end]=='\x1b'?2:1);continue;
                }
                i+=2;continue;
            }
            if(ch=='\r')column=0;else if(ch=='\n')row=Math.Min(29,row+1);else if(ch=='\b')column=Math.Max(0,column-1);
            else if(ch>=' '){screen[row,column]=ch;column=Math.Min(79,column+1);}
            i++;
        }pending=pending.Substring(i);
    }
    public string Visible {get{lock(received){var text=new StringBuilder();for(int r=0;r<30;r++){for(int c=0;c<80;c++)text.Append(screen[r,c]=='\0'?' ':screen[r,c]);text.Append('\n');}return text.ToString();}}}
    public void Expect(string text,int after,int milliseconds){var watch=Stopwatch.StartNew();while(watch.ElapsedMilliseconds<milliseconds){lock(received){if(received.Length>after&&(DateTime.UtcNow-lastOutput).TotalMilliseconds>=60&&Visible.Contains(text))return;}Thread.Sleep(25);}throw new Exception("Missing "+text+". Console output: "+Visible);}
    public void ExpectExit(){if(WaitForSingleObject(child.Process,3000)!=0)throw new Exception("Ctrl+C did not stop the CLI. Output: "+Output);}
    public void Dispose(){if(child.Process!=IntPtr.Zero){TerminateProcess(child.Process,0);CloseHandle(child.Process);CloseHandle(child.Thread);}if(console!=IntPtr.Zero)ClosePseudoConsole(console);CloseHandle(input);CloseHandle(output);if(attributes!=IntPtr.Zero){DeleteProcThreadAttributeList(attributes);Marshal.FreeHGlobal(attributes);}}
}
