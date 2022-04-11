yes | cp /app/nginx/nginx.conf /etc/nginx/nginx.conf
pm2 start /app/browser_server.js --node-args="--max_old_space_size=2048" --wait-ready --listen-timeout 30000
pm2 logs browser_server --lines 1000 &
replace=$(jq ".host" /app/chromium.json -r) && sed -i "s~{{ws_chromium_host}}~${replace}~g" /etc/nginx/nginx.conf
replace=$(jq ".path" /app/chromium.json -r) && sed -i "s~{{ws_chromium_path}}~${replace}~g" /etc/nginx/nginx.conf
replace=$(jq ".host" /app/firefox.json -r) && sed -i "s~{{ws_firefox_host}}~${replace}~g" /etc/nginx/nginx.conf
replace=$(jq ".path" /app/firefox.json -r) && sed -i "s~{{ws_firefox_path}}~${replace}~g" /etc/nginx/nginx.conf
replace=$(jq ".host" /app/webkit.json -r) && sed -i "s~{{ws_webkit_host}}~${replace}~g" /etc/nginx/nginx.conf
replace=$(jq ".path" /app/webkit.json -r) && sed -i "s~{{ws_webkit_path}}~${replace}~g" /etc/nginx/nginx.conf
cat /etc/nginx/nginx.conf
nginx -t
service nginx start
