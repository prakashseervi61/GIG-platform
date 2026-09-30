# Client image builder. Select the app with: --build-arg APP=customer|worker|admin
FROM node:22-alpine AS build
ARG APP=customer
WORKDIR /app
COPY package.json package-lock.json ./
COPY customer/package.json ./customer/
COPY worker/package.json ./worker/
COPY admin/package.json ./admin/
RUN npm ci
COPY . .
RUN npm run build --workspace coop-gig-${APP}

FROM nginx:1.27-alpine AS runtime
ARG APP=customer
ENV APP=${APP}
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/${APP}/dist /usr/share/nginx/html
EXPOSE 80
