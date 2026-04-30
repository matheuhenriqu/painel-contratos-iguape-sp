export default {
  extends: ['stylelint-config-recommended'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'no-descending-specificity': null,
  },
  ignoreFiles: ['assets/vendor/**/*.css', 'coverage/**', 'node_modules/**'],
};
