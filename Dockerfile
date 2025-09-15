# Use uma imagem base oficial do Node.js.
# A versão 18 é uma boa escolha (LTS - Long Term Support)
FROM node:18-slim

# Crie e defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie os arquivos de manifesto do projeto (package.json e package-lock.json)
# Isso otimiza o cache de layers do Docker
COPY package*.json ./

# Instale as dependências de produção do projeto
RUN npm install --only=production

# Copie o restante dos arquivos da sua aplicação para o diretório de trabalho
COPY . .

# Exponha a porta que sua aplicação usa (seu index.js usa process.env.PORT ou 3001)
EXPOSE 3001

# Comando para iniciar a aplicação quando o contêiner for executado
CMD [ "npm", "start" ]