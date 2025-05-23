export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
}));
