using System;
using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;
using System.Reflection;

namespace App {
	public class Winctx : Form {
		[STAThread]
		public static void Run(Action<Winctx> main) {
			Application.EnableVisualStyles();
			Application.Run(new Winctx(main));
		}

		private Action onended = new Action(() => {});
		private string[] events = {"click"};

		public Winctx(Action<Winctx> main) {
			main(this);
			onended();
		}

		public void AddEvent(object sender, string e, Action<object,EventArgs> a) {
			if(Array.Exists(events,x => x == e)) {
				Type t = sender.GetType();
				EventInfo ev = t.GetEvent(e);
				ev.AddEventHandler(sender,Delegate.CreateDelegate(ev.EventHandlerType,RuntimeReflectionExtensions.GetMethodInfo(a)));
			}
		}

		public void Alert(string message) {
			MessageBox.Show(message);
		}

		public void AppendChild(Control e) {
			this.Controls.Add(e);
		}

		public void SetInterval(Action h,int m) {
			System.Windows.Forms.Timer t = new System.Windows.Forms.Timer();
			t.Interval = m;
			t.Tick += new EventHandler((object sender,EventArgs e) => {
				t.Stop();
				h();
				t.Enabled = true;
			});
			t.Start();
		}
	}

	public class Canvas : Control {
		private CanvasRenderingContext ctx;

		public Canvas(int width, int height) {
			Left = 50;
			Top = 50;
			Width = width;
			Height = height;
			Dock = DockStyle.Fill;
			BackColor = Color.White;
			Paint += new PaintEventHandler(OnPainted);
			ctx = new CanvasRenderingContext(this);
		}

		public CanvasRenderingContext GetContext() {
			return ctx;
		}

		public void OnPainted(object sender,PaintEventArgs e) {
			if(ctx != null) {
				ctx.Update(sender,e);
			}
		}
	}

	public class CanvasRenderingContext {
		private Color fillcolor = Color.Black;
		public Canvas canvas {get;set;}
		public Color FillStyle {
			get { return fillcolor; }
			set { fillcolor = value; }
		}
		private Action<object,PaintEventArgs> render { get; set; }

		public CanvasRenderingContext(Canvas c) {
			canvas = c;
		}

		public void Rect(int x,int y,int width,int height) {
			render += ((object sender,PaintEventArgs e) => {
				Rectangle rect = new Rectangle(x,y,width,height);
				e.Graphics.DrawRectangle(Pens.Black, rect);
			});
		}

		public void FillRect(int x, int y, int width, int height, Color col) {
			//do something about render
			render += ((object sender,PaintEventArgs e) => {
				SolidBrush b = new SolidBrush(col);
				Rectangle rect = new Rectangle(x,y,width,height);
				e.Graphics.FillRectangle(b, rect);
			});
		}

		public void Clear() {
			render += ((object sender,PaintEventArgs e) => {
				e.Graphics.Clear(Color.White);
			});
		}

		public void Update(object sender,PaintEventArgs e) {
			//something strange is happening
			if(render != null) {
				render(sender,e);
			}
		}
	}
}