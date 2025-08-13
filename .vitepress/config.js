export default {
  title: 'Search with Elastic',
  description: 'Comprehensive Elasticsearch integration for Craft CMS 4.x with real-time indexing, advanced querying, and production reliability',
  base: '/',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#de412a' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Requirements', link: '/getting-started/requirements' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' }
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Basic Setup', link: '/configuration/basic-setup' },
            { text: 'Environment Config', link: '/configuration/environment-config' },
            { text: 'Index Settings', link: '/configuration/index-settings' },
            { text: 'Multi-Site Setup', link: '/configuration/multi-site' }
          ]
        },
        {
          text: 'Template Usage',
          items: [
            { text: 'Template Integration', link: '/usage/template-integration' },
            { text: 'Search Implementation', link: '/usage/search-implementation' },
            { text: 'Results Display', link: '/usage/results-display' },
            { text: 'Frontend Examples', link: '/usage/frontend-examples' }
          ]
        },
        {
          text: 'CLI Tools',
          items: [
            { text: 'Index Management', link: '/cli/index-management' },
            { text: 'Debugging', link: '/cli/debugging' },
            { text: 'Maintenance', link: '/cli/maintenance' }
          ]
        },
        {
          text: 'Control Panel',
          items: [
            { text: 'Dashboard', link: '/control-panel/dashboard' },
            { text: 'Index Management', link: '/control-panel/index-management' },
            { text: 'Utilities', link: '/control-panel/utilities' }
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Services & API', link: '/development/services-api' },
            { text: 'Custom Indexers', link: '/development/custom-indexers' },
            { text: 'Events', link: '/development/events' },
            { text: 'Extending', link: '/development/extending' }
          ]
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Performance Optimization', link: '/advanced/performance' },
            { text: 'Troubleshooting', link: '/advanced/troubleshooting' },
            { text: 'Advanced Features', link: '/advanced/advanced-features' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Basic Search', link: '/examples/basic-search' },
            { text: 'Faceted Search', link: '/examples/faceted-search' },
            { text: 'Custom Implementations', link: '/examples/custom-implementations' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pennebaker/craft-searchwithelastic' }
    ],

    footer: {
      message: 'Released under Proprietary License.',
      copyright: 'Copyright © 2025 Pennebaker'
    },

    editLink: {
      pattern: 'https://github.com/pennebaker/craft-searchwithelastic-docs/edit/docs/:path',
      text: 'Edit this page on GitHub'
    },

    search: {
      provider: 'local'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    }
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    container: {
      tipLabel: 'TIP',
      warningLabel: 'WARNING',
      dangerLabel: 'DANGER',
      infoLabel: 'INFO',
      detailsLabel: 'Details'
    }
  },

  sitemap: {
    hostname: 'https://searchwithelastic.pennebaker.io'
  }
}
