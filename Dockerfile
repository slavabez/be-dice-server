FROM node:14-alpine

WORKDIR /usr/src/app

# Copy the package file and the lockfile
COPY package.json ./
COPY yarn.lock ./

# Download dependencies
RUN yarn install

# Copy the tsconfig file
COPY tsconfig.json .

# Now copy the source code
COPY src ./src

# Build (transpile from TS to JS)
RUN yarn run build

# Runs on port 3050 by default
EXPOSE 3050

# PM2 is used by default via package.json, just need to run 'yarn run start'
CMD ["yarn", "run", "start"]
