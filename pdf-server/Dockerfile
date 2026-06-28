FROM node:20-slim

# TeX Live packages that cover academic papers (IEEE, ACM, thesis)
# Skipping texlive-fonts-extra to keep image size reasonable (~1.2 GB)
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-science \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js .

EXPOSE 3001
CMD ["node", "server.js"]
