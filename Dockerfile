FROM mhart/alpine-node:6
ADD . /root
WORKDIR /root
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]
