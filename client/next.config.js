const nextConfig = {
    env: {
      SERVER_ENDPOINT: process.env.SERVER_ENDPOINT,
    },
    webpack: (config) => {
      config.module.rules.push(
        {
          test: /canvas/,
          use: 'ignore-loader',
        },
        {
          test: /pdf\.worker\.min\.js$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'static/chunks/',
          },
        }
      );
      return config;
    },
  };
  
  module.exports = nextConfig;