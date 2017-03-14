FROM mhart/alpine-node:6
ADD . /root
WORKDIR /root
RUN npm install

EXPOSE 80
CMD [ "npm", "start" ]
