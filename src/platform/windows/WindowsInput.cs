using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

// Attach explicitly to the game console. A hidden PowerShell can otherwise
// read its own console forever while falsely reporting that input is ready.
public static class CliInput {
    [StructLayout(LayoutKind.Sequential)] public struct Coord {public short X,Y;}
    [StructLayout(LayoutKind.Sequential)] public struct Rect {public short Left,Top,Right,Bottom;}
    [StructLayout(LayoutKind.Sequential)] public struct BufferInfo {public Coord Size,Cursor;public ushort Attributes;public Rect Window;public Coord Maximum;}
    [StructLayout(LayoutKind.Explicit,Size=20)] public struct Record {
        [FieldOffset(0)] public ushort Type;
        [FieldOffset(4)] public int Down;
        [FieldOffset(8)] public ushort Repeat;
        [FieldOffset(10)] public ushort VirtualKey;
        [FieldOffset(14)] public char Character;
        [FieldOffset(16)] public uint Controls;
        [FieldOffset(4)] public Coord Position;
        [FieldOffset(8)] public uint Buttons;
        [FieldOffset(16)] public uint MouseFlags;
    }
    [DllImport("kernel32.dll")]static extern IntPtr GetStdHandle(int n);
    [DllImport("kernel32.dll")]static extern bool FreeConsole();
    [DllImport("kernel32.dll")]static extern bool AttachConsole(uint pid);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
    [DllImport("kernel32.dll")]static extern bool GetConsoleMode(IntPtr h,out uint mode);
    [DllImport("kernel32.dll")]static extern bool SetConsoleMode(IntPtr h,uint mode);
    [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint milliseconds);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool ReadConsoleInputW(IntPtr h,out Record record,uint length,out uint count);
    [DllImport("kernel32.dll")]static extern bool GetConsoleScreenBufferInfo(IntPtr h,out BufferInfo info);
    public static void Run(int parentId) {
        // Capture the IPC pipes before AttachConsole changes standard handles.
        var writer=new StreamWriter(new FileStream(new SafeFileHandle(GetStdHandle(-11),false),FileAccess.Write),new UTF8Encoding(false));writer.AutoFlush=true;
        var control=new StreamReader(new FileStream(new SafeFileHandle(GetStdHandle(-10),false),FileAccess.Read));
        FreeConsole();if(!AttachConsole((uint)parentId))throw new Exception("Cannot attach to game console");
        IntPtr input=CreateFile("CONIN$",0xc0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
        IntPtr output=CreateFile("CONOUT$",0x80000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
        uint original;if(input==new IntPtr(-1)||!GetConsoleMode(input,out original))throw new Exception("Console unavailable");
        writer.WriteLine("READY");
        if(control.ReadLine()!="GO")return;
        if(!SetConsoleMode(input,0x98))throw new Exception("Cannot enable console mouse");
        writer.WriteLine("ACTIVE");uint previous=0;
        try {using(Process parent=Process.GetProcessById(parentId))while(!parent.HasExited){
            if(WaitForSingleObject(input,100)!=0)continue;
            Record r;uint count;if(!ReadConsoleInputW(input,out r,1,out count)||count==0)break;
            if(r.Type==1&&r.Down!=0){
                string key=null;
                switch(r.VirtualKey){case 37:key="\x1b[D";break;case 38:key="\x1b[A";break;case 39:key="\x1b[C";break;case 40:key="\x1b[B";break;case 13:key="\r";break;case 8:key="\x7f";break;case 27:key="\x1b";break;default:if(r.Character!='\0')key=r.Character.ToString();break;}
                if(r.VirtualKey==67&&(r.Controls&12)!=0)key="\x03";
                if(key!=null)for(int i=0;i<Math.Max(1,(int)r.Repeat);i++)writer.WriteLine("K;"+Convert.ToBase64String(Encoding.UTF8.GetBytes(key)));
            }else if(r.Type==2){
                uint pressed=r.Buttons&~previous;previous=r.Buttons;
                if(r.MouseFlags==0&&(pressed&3)!=0){BufferInfo info;int top=0,left=0;if(GetConsoleScreenBufferInfo(output,out info)){top=info.Window.Top;left=info.Window.Left;}
                    writer.WriteLine("M;"+(r.Position.X-left+1)+";"+(r.Position.Y-top+1)+";"+((pressed&1)!=0?0:2));}
            }else if(r.Type==4)writer.WriteLine("RESIZE");
        }}finally{CloseHandle(input);CloseHandle(output);FreeConsole();}
    }
}
