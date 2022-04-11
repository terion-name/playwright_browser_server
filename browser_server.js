try {
  require('dotenv').config();
} catch (e) {
  console.log(e.message);
}

const fs = require('fs');
const { chromium, firefox, webkit } = require('playwright');
const inDocker = require('is-docker')();

if (inDocker) {
  console.log('Detected docker environment');
}

const launchConfig = [
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-component-extensions-with-background-pages",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-features=TranslateUI,BlinkGenPropertyTrees",
  "--disable-ipc-flooding-protection",
  "--disable-renderer-backgrounding",
  "--enable-features=NetworkService,NetworkServiceInProcess",
  "--force-color-profile=srgb",
  "--hide-scrollbars",
  "--metrics-recording-only",
  "--mute-audio",
  // "--headless",
  "--no-sandbox",
  // `--window-size=${device.viewportWidth},${device.viewportHeight}`
]

let endpoints = {
  chromium: null,
  firefox: null,
  webkit: null,
};

let instances = {
  chromium: null,
  firefox: null,
  webkit: null,
};

function launchRouter() {
  const router = require('express')();
  router.get('/chromium', (req, res) => res.send(endpoints.chromium));
  router.get('/firefox', (req, res) => res.send(endpoints.firefox));
  router.get('/webkit', (req, res) => res.send(endpoints.webkit));
  router.get('/ready', (req, res) => res.send(endpoints.chromium && endpoints.firefox && endpoints.webkit ? '1' : '0'));
  router.get('/', (req, res) => {
    fs.readFile('/app/chromium.json', 'utf8',(err, contents) => {
      if (JSON.parse(contents).path === instances.chromium.wsEndpoint().substring(5).split('/')[1]) {
        res.send('ok');
      } else {
        res.status(500).send('fail');
      }
    })
  });
  router.listen(process.env.BROWSER_SERVER_MANAGEMENT_PORT || 9000, () => console.log(`Browser router is running at http://0.0.0.0:${process.env.BROWSER_SERVER_MANAGEMENT_PORT || 9000}`));
}

function launchBrowsers() {
  [chromium, firefox, webkit].forEach((browser) => {
    const name = browser.name();
    browser.launchServer({
      headless: !process.env.HEADFUL,
      args: name === 'chromium' ? launchConfig : [],
      logger: {
        isEnabled: (name, severity) => name === 'browser',
        log: (name, severity, message, args) => console.log(`${name} ${message}`)
      }
      // port: 9001
    }).then(function (server){
      instances[name] = server;
      endpoints[name] = server.wsEndpoint();
      console.log(name, 'server launched at', endpoints[name]);
      if (inDocker) {
        let upstream = endpoints[name].substring(5).split('/');
        fs.writeFileSync('/app/'+name+'.json', JSON.stringify({host: upstream[0], path: upstream[1]}));
        server.on("close", ()=>{
          console.log(name, 'server closed');
          process.exit();
        })
      }

      if (Object.values(endpoints).filter(v => v).length === Object.keys(endpoints).length) {
        console.log('All browsers are ready', endpoints);
        if (inDocker) {
          console.log('Updating nginx config');
          const template = fs.readFileSync('/app/nginx/nginx.conf', 'utf-8');
          fs.writeFileSync(
            '/etc/nginx/nginx.conf',
            Object.keys(endpoints).reduce((t, bn)=>{
              const e = endpoints[bn].substring(5).split('/');
              return t.replace(`{{ws_${bn}_host}}`, e[0]).replace(`{{ws_${bn}_path}}`, e[1])
            }, template)
          );
          require('child_process').exec('service nginx reload');
        }
        process.send && process.send('ready');
      }
    });
  })
}

launchRouter();
launchBrowsers();
