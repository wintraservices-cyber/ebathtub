// sanity.cli.js
// Plain export — works across all Sanity v3 versions
// without relying on defineCliConfig which varies by release

export default {
  api: {
    projectId: '6fogodef',
    dataset: 'production',
  },
  studioHost: 'ebathtub',
}
