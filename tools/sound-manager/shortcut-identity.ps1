# Windows uses a common AppUserModelID to group a launcher, window and pin.
# References: Microsoft Application User Model IDs and System.AppUserModel.ID.
$soundTaskbarAppId = 'Calzon.SimpleSoundManager'
if (-not ('SoundManagerShortcutIdentity' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class SoundManagerShortcutIdentity {
    [StructLayout(LayoutKind.Sequential, Pack=4)]
    public struct PropertyKey { public Guid fmtid; public uint pid; }
    [StructLayout(LayoutKind.Explicit, Size=24)]
    public struct PropVariant {
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr pointer;
    }
    [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPropertyStore {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int GetAt(uint index, out PropertyKey key);
        [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
        [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant value);
        [PreserveSig] int Commit();
    }
    [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
    static extern int SHGetPropertyStoreFromParsingName(string path, IntPtr context, uint flags, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);
    [DllImport("shell32.dll")]
    static extern int SHGetPropertyStoreForWindow(IntPtr window, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);
    [DllImport("ole32.dll")]
    static extern int PropVariantClear(ref PropVariant value);
    [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
    static extern void SHChangeNotify(int evt, uint flags, string path, IntPtr other);

    static PropertyKey IdKey() { return new PropertyKey { fmtid=new Guid("9f4c2855-9f79-4b39-a8d0-e1d42de1d5f3"), pid=5 }; }
    static void Write(IPropertyStore store, string id, bool commit) {
        var key=IdKey();
        var value=new PropVariant { vt=31, pointer=Marshal.StringToCoTaskMemUni(id) };
        try {
            Marshal.ThrowExceptionForHR(store.SetValue(ref key, ref value));
            if (commit) Marshal.ThrowExceptionForHR(store.Commit());
        } finally { Marshal.FreeCoTaskMem(value.pointer); }
    }
    static string Read(IPropertyStore store) {
        var key=IdKey(); PropVariant value;
        Marshal.ThrowExceptionForHR(store.GetValue(ref key, out value));
        try { return value.vt==31 ? Marshal.PtrToStringUni(value.pointer) : ""; }
        finally { PropVariantClear(ref value); }
    }
    public static void SetShortcut(string path, string id) {
        var iid=typeof(IPropertyStore).GUID; IPropertyStore store;
        Marshal.ThrowExceptionForHR(SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 2, ref iid, out store));
        try { Write(store, id, true); }
        finally { Marshal.FinalReleaseComObject(store); }
        SHChangeNotify(0x00002000, 0x0005, path, IntPtr.Zero);
    }
    public static string GetShortcut(string path) {
        var iid=typeof(IPropertyStore).GUID; IPropertyStore store;
        Marshal.ThrowExceptionForHR(SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 0, ref iid, out store));
        try { return Read(store); }
        finally { Marshal.FinalReleaseComObject(store); }
    }
    public static void SetWindow(IntPtr window, string id) {
        var iid=typeof(IPropertyStore).GUID; IPropertyStore store;
        Marshal.ThrowExceptionForHR(SHGetPropertyStoreForWindow(window, ref iid, out store));
        try { Write(store, id, false); }
        finally { Marshal.FinalReleaseComObject(store); }
    }
    public static string GetWindow(IntPtr window) {
        var iid=typeof(IPropertyStore).GUID; IPropertyStore store;
        Marshal.ThrowExceptionForHR(SHGetPropertyStoreForWindow(window, ref iid, out store));
        try { return Read(store); }
        finally { Marshal.FinalReleaseComObject(store); }
    }
}
'@
}
function Set-SoundManagerShortcutIdentity([string]$Path) {
    [SoundManagerShortcutIdentity]::SetShortcut($Path, $soundTaskbarAppId)
}
