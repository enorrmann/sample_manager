import { protocol as s, app as n, BrowserWindow as r, net as R } from "electron";
import { fileURLToPath as h, pathToFileURL as P } from "node:url";
import o from "node:path";
s.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { secure: !0, supportFetchAPI: !0, bypassCSP: !0 } }
]);
const a = o.dirname(h(import.meta.url));
process.env.APP_ROOT = o.join(a, "..");
const i = process.env.VITE_DEV_SERVER_URL, T = o.join(process.env.APP_ROOT, "dist-electron"), c = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? o.join(process.env.APP_ROOT, "public") : c;
let e;
function d() {
  e = new r({
    icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: o.join(a, "preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), i ? e.loadURL(i) : e.loadFile(o.join(c, "index.html"));
}
n.on("window-all-closed", () => {
  process.platform !== "darwin" && (n.quit(), e = null);
});
n.on("activate", () => {
  r.getAllWindows().length === 0 && d();
});
n.whenReady().then(() => {
  import("./handlers-BoYob0xL.js").then((t) => t.X).then(async ({ registerHandlers: t }) => {
    await t(), s.handle("media", (l) => {
      const p = l.url.replace("media://", ""), m = decodeURIComponent(p);
      return R.fetch(P(m).toString());
    }), d();
  });
});
export {
  T as MAIN_DIST,
  c as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
