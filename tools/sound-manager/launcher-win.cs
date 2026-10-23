// Conventional Windows launcher: no PyInstaller one-file extraction.
using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

internal static class SoundManagerLauncher
{
    private static readonly Regex VersionName = new Regex(@"^\d+\.\d+\.\d+$", RegexOptions.CultureInvariant);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string id);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern bool SetDllDirectory(string path);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBox(IntPtr hwnd, string text, string caption, uint flags);

    private static string ResolveRelease(string root)
    {
        string folder = Path.Combine(root, "releases");
        string marker = Path.Combine(root, "current_release.txt");
        string selected = null;
        if (File.Exists(marker))
        {
            selected = File.ReadAllText(marker).Trim();
            if (!VersionName.IsMatch(selected))
                throw new InvalidDataException("Invalid release marker.");
        }
        else
        {
            if (!Directory.Exists(folder)) throw new FileNotFoundException("No Sound Manager releases installed.");
            Version best = null;
            foreach (string path in Directory.GetDirectories(folder))
            {
                string name = Path.GetFileName(path);
                Version v;
                if (!VersionName.IsMatch(name) || !Version.TryParse(name, out v) ||
                    !File.Exists(Path.Combine(path, "SimpleSoundManager.exe"))) continue;
                if (best == null || v.CompareTo(best) > 0) { best = v; selected = name; }
            }
        }
        if (selected == null) throw new FileNotFoundException("No installed Sound Manager release found.");
        string exe = Path.Combine(folder, selected, "SimpleSoundManager.exe");
        if (!File.Exists(exe)) throw new FileNotFoundException("Installed Sound Manager version is missing: " + selected);
        return exe;
    }

    private static string Quote(string arg)
    {
        if (arg.Length > 0 && arg.IndexOfAny(new char[] { ' ', '\t', '"' }) < 0) return arg;
        StringBuilder result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in arg)
        {
            if (c == '\\') { slashes++; continue; }
            if (c == '"')
            {
                result.Append('\\', slashes * 2 + 1).Append('"');
                slashes = 0;
                continue;
            }
            result.Append('\\', slashes);
            slashes = 0;
            result.Append(c);
        }
        result.Append('\\', slashes * 2);
        return result.Append('"').ToString();
    }

    [STAThread]
    private static void Main(string[] args)
    {
        try
        {
            SetCurrentProcessExplicitAppUserModelID("Calzon.SimpleSoundManager");
            string target = ResolveRelease(AppDomain.CurrentDomain.BaseDirectory);
            SetDllDirectory(null);
            ProcessStartInfo info = new ProcessStartInfo(target);
            info.WorkingDirectory = Path.GetDirectoryName(target);
            info.UseShellExecute = false;
            info.Arguments = string.Join(" ", Array.ConvertAll(args, Quote));
            info.EnvironmentVariables["PYINSTALLER_RESET_ENVIRONMENT"] = "1";
            if (Process.Start(info) == null) throw new InvalidOperationException("Could not start installed application.");
        }
        catch (Exception error)
        {
            MessageBox(IntPtr.Zero, "Cannot open Simple Sound Manager:\n" + error.Message +
                "\nRun its installer to repair the installation.", "Simple Sound Manager", 0x10);
            Environment.ExitCode = 1;
        }
    }
}
