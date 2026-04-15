FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY publications.json /usr/share/nginx/html/

EXPOSE 80