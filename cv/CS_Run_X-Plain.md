```cs
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using System.IO;

namespace X_PLAIN
{
    public partial class FormTutorialRun : Form
    {
        string ModulePath;
        string ModuleTitle;
        string PatientId;
        string folderPath;

        int nextOp = 0;
        int ModulePointer = 0;
        string Lang = "0";

        XmlNodeList TUT;

        List<string> Fav = new List<string>();

        XmlDocument xmldoc = new XmlDocument();

        public FormTutorialRun()
        {
            InitializeComponent();
            NavPrevious.TabStop = false;
            NavPrevious.FlatStyle = FlatStyle.Flat;
            NavPrevious.FlatAppearance.BorderSize = 0;
            NavPrevious.FlatAppearance.BorderColor = Color.FromArgb(0, 255, 255, 255);
            NavNext.TabStop = false;
            NavNext.FlatStyle = FlatStyle.Flat;
            NavNext.FlatAppearance.BorderSize = 0;
            NavNext.FlatAppearance.BorderColor = Color.FromArgb(0, 255, 255, 255);
        }

        public void setModuleParam( string ModulePathV , string ModuleTitleV , string folderPathv , List<string> Favv , string PatientIDV )
        {
            ModuleTitle = ModuleTitleV;
            ModulePath = ModulePathV;
            PatientId = PatientIDV;
            folderPath = folderPathv;
            Fav = Favv;

            Console.WriteLine("ModuleForm:" + ModuleTitle + "/" + ModulePath + "/" + folderPath + "/" + PatientId);

            SI.Image = Image.FromFile(folderPath + "/" + ModulePath + "/si.png");
            ModuleTitleL.Text = ModuleTitle;

            if (Fav.Contains(ModulePath))
            {
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOn.png");
            }
            else
            {
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOff.png");
            }

            // loadModule(true);
            Lang = ModulePath.Substring(ModulePath.Length - 2, 1);
            Console.WriteLine("Lang:" + Lang);
            string sPath = folderPath + "/System/Common/branding_" + Lang + "1.png";
            pictureBox1.Image = Image.FromFile(sPath);

            menuForm mmF = new menuForm();
            mmF.MainMenu();
            Application.DoEvents();
        }

        private void Form7_Load(object sender, EventArgs e)
        {
            SI.Image = Image.FromFile(folderPath + "/" + ModulePath + "/si.png");
            ModuleTitleL.Text = ModuleTitle;
            loadModule(true);

            if (Fav.Contains(ModulePath))
            {
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOn.png");
            }
            else
            {
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOff.png");
            }

        }

        private void showFB(string FB)
        {
            string sPath = folderPath + "/" + ModulePath + "/mobile/slides/m_" + FB + ".png";
            pictureBox1.Image = Image.FromFile(sPath);
            string mp3Path = folderPath + "/" + ModulePath + "/mobile/sound/m_s" + FB + ".mp3";
            WMP.URL = mp3Path;
        }

        public void FavoriteChange(object sender, MouseEventArgs e)
        {
            Console.WriteLine("***ModulePath:" + ModulePath);

            if (Fav.Contains(ModulePath))
            {
                // Fav.IndexOf(ModulePath);
                Console.WriteLine("Fav Found");
                Fav.Remove(ModulePath);
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOff.png");

            }
            else
            {
                Console.WriteLine("Fav NOT found");
                Fav.Add(ModulePath);
                Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOn.png");
            }

            // System.IO.File.WriteAllLines(folderPath + "common/Favorites.txt", Fav.verbList);
            using (System.IO.StreamWriter file = new System.IO.StreamWriter(@folderPath + "\\System\\Parameters\\Favorites.txt"))
                foreach (string line in Fav)
                {
                    file.WriteLine(line);
                }
        }

        private void loadModule( bool FirstRun )
        {
            Assistance.Visible = false;
            timer1.Stop();

            string Tutorialfile = folderPath + "/" + ModulePath + "/mobile/A2.xml";
            Console.WriteLine("ModulePath:" + Tutorialfile);

            if (File.Exists(Tutorialfile))
            {

                // Favorite.Image = Image.FromFile( folderPath + "common/FavOff.png" );

                xmldoc.Load(Tutorialfile);
                TUT = xmldoc.SelectNodes("//s");

                if (FirstRun)
                {
                    progressBar1.Maximum = TUT.Count;
                    if (Fav.Contains(ModulePath))
                    {
                        Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOn.png");
                    }
                    else
                    {
                        Favorite.Image = Image.FromFile(folderPath + "\\System\\common\\FavOff.png");
                    }
                }

                progressBar1.Value = ModulePointer;

                if ((TUT[ModulePointer] as XmlElement).GetAttribute("p") == "q")
                {
                    nextOp = -99;
                    NavNext.Enabled = false;
                }

                string ext = ".png";
                if ((TUT[ModulePointer] as XmlElement).GetAttribute("a") == "1") ext = ".gif";
                if ((TUT[ModulePointer] as XmlElement).GetAttribute("p") == "s") ext = "_S.png";

                string sPath = folderPath + "/" + ModulePath + "/mobile/slides/m_" + (TUT[ModulePointer] as XmlElement).GetAttribute("f") + ext;
                pictureBox1.Image = Image.FromFile(sPath);

                string mp3Path = folderPath + "/" + ModulePath + "/mobile/sound/m_s" + (TUT[ModulePointer] as XmlElement).GetAttribute("f") + ".mp3";

                WMP.URL = mp3Path;
                timer1.Start();
            }
            else
            {
                // webBrowser1.DocumentText = "<button ID=HOME >Home</button>&nbsp;&nbsp;<button ID=BACK >Back</button><br><br><h1>Tutorial Missing!</h1>";
                Console.WriteLine("Error: Tutorial is missing ( could not find folder)  ");
            }
        }

        private void pauseAudio(object sender, EventArgs e)
        {
            WMP.Ctlcontrols.pause();
        }

        private void AudioRepeat(object sender, EventArgs e)
        {
            WMP.Ctlcontrols.currentPosition = 0;
            WMP.Ctlcontrols.play();

        }

        private void ButtonClose_clk(object sender, EventArgs e)
        {
            WMP.Ctlcontrols.stop();
            // loadXML("", "", true);
            // TutorialGroup.Visible = false;
            this.Hide();
        }

        private void UserClick(object sender, MouseEventArgs e)
        {
            // MessageBox.Show(string.Format("X: {0} Y: {1}  width: {2} ", MousePosition.X, MousePosition.Y , pictureBox1.Size.Width ));

            int xPcnt = (int)100 * e.X / pictureBox1.Size.Width;
            int yPcnt = (int)100 * e.Y / pictureBox1.Size.Height;

            COORD.Text = string.Format("X: {0} - Y: {1} ", xPcnt, yPcnt);
            if (nextOp == -99)
            {
                Console.WriteLine("TOT:" + (TUT[ModulePointer] as XmlElement).GetAttribute("f") + "~" + (TUT[ModulePointer] as XmlElement).GetAttribute("p"));
                // (n as XmlElement).GetAttribute("id") 

                int Tmp = (TUT[ModulePointer] as XmlElement).ChildNodes.Count;

                string FB = "";
                int cn = 0;
                int BN = 0;
                Console.WriteLine("FB:" + Tmp.ToString());

                foreach (XmlElement xe in (TUT[ModulePointer] as XmlElement).SelectNodes("f"))
                {
                    Console.WriteLine("Feedback:" + xe.GetAttribute("f"));
                    cn += 1;
                    string[] btCoordA = (TUT[ModulePointer] as XmlElement).GetAttribute("b" + cn.ToString()).Split(',');
                    //                Console.WriteLine("B-coord:[" + "b" + cn.ToString() + "]" + btCoordA[0] + "~~~" + btCoordA[1] );
                    if (int.Parse(btCoordA[0]) < xPcnt && xPcnt < int.Parse(btCoordA[2]) && int.Parse(btCoordA[1]) < yPcnt && yPcnt < int.Parse(btCoordA[3]))
                    {
                        FB = xe.GetAttribute("f");
                        BN = cn;
                    }
                }
                if (FB == "")
                {
                    nextOp = -99;
                }
                else
                {
                    if (int.Parse((TUT[ModulePointer] as XmlElement).GetAttribute("ca")) == BN)
                    {
                        nextOp = 1;
                    }
                    else
                    {
                        nextOp = -1;
                    }
                    showFB(FB);
                    NavNext.Enabled = true;
                    Console.WriteLine(FB + ":FB:" + BN.ToString() + " ... nextOp=" + nextOp.ToString());
                }
            }
        }

        private void NavNext_Click(object sender, EventArgs e)
        {
            if (nextOp == 0 || nextOp == 1) ModulePointer += 1;
            loadModule(false);
        }

        private void NavPrevious_Click(object sender, EventArgs e)
        {
            if (ModulePointer > 0) ModulePointer -= 1;
            NavNext.Enabled = true;
            nextOp = 0;
            loadModule(false);
        }

        private void ButtonClose_Click(object sender, EventArgs e)
        {
            WMP.Ctlcontrols.stop();
            this.Close();  // .Hide();
        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            string assPath;
             if (nextOp < 0 )
            {
                 assPath = folderPath + "/System/common/answer_question_" + Lang + "1.png" ;
            } else
            {
                 assPath = folderPath + "/System/common/press_arrow_to_continue_" + Lang + "1.png";
            }
            
            Assistance.Image = Image.FromFile(assPath);
            Assistance.Visible = true;
        }
    }
}

```
