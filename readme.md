`GET /{chromium|webkit|firefox}` returns WS-address for conection:

```js
await browser.connect({
    wsEndpoint: (await axios.get(`${process.env.BROWSER_SERVER}/chromium`)).data
})
```