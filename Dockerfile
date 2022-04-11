FROM mcr.microsoft.com/playwright:v1.20.0-focal
USER root
RUN apt-get update
RUN apt-get install nginx jq -y
RUN npm install pm2@latest -g
#USER pwuser
WORKDIR /app
COPY . ./
# this is not released yet https://github.com/microsoft/playwright/issues/3087#issuecomment-662613910
# RUN cp -r /home/pwuser/.cache /root/.cache
RUN npm install
CMD /app/nginx/docker-entrypoint.d/start.sh
