using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Windows;

namespace BoardGameArena
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            if (e.Args != null && e.Args.Length > 0)
            {
                Application.Current.Properties["PrimaryArgument"] = e.Args[0].ToString();
            }
            else // ActivationArguments may not be needed any more
            {
                try
                {
                    if (AppDomain.CurrentDomain.SetupInformation.ActivationArguments.ActivationData != null
                     && AppDomain.CurrentDomain.SetupInformation.ActivationArguments.ActivationData.Length > 0)
                    {
                        string fname = AppDomain.CurrentDomain.SetupInformation.ActivationArguments.ActivationData[0];
                        // It comes in as a URI; this helps to convert it to a path.
                        Uri uri = new Uri(fname);
                        fname = uri.LocalPath;
                        Application.Current.Properties["PrimaryArgument"] = fname;
                    }
                }
                catch
                {
                }
            }
            base.OnStartup(e);
        }
    }
}
