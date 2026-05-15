module.exports = {
  plugins: [
    {
      name: 'removeDimensions',
      active: true,
    },
    {
      name: 'removeAttrs',
      params: {
        attrs: '(fill|stroke)',
      },
    },
  ],
};
