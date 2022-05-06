FROM node:14.19.1-alpine

# Install global npm packages
RUN npm i -g @angular/cli@13.3.1


USER node

# Set working directory
WORKDIR /home/node

# directory for the built angular files
RUN mkdir /home/node/dist

# Copy and install local npm packages
COPY --chown=node:node app/package.json* app/package-lock.json* ./mole_app/
WORKDIR /home/node/mole_app

RUN npm install --no-optional

# Copy the remaining source code
COPY --chown=node:node ./app .