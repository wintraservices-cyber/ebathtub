// sanity.config.js
// Main Sanity Studio configuration for eBathtub.com
// Run `npm run dev` to start the studio locally at http://localhost:3333
// Run `npm run deploy` to deploy the studio to [your-project].sanity.studio

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'ebathtub',
  title: 'eBathtub.com Admin',

  // ⚠️ Replace these with your real Sanity project ID and dataset
  // Get them from: sanity.io/manage → your project → Settings → API
  projectId: '6fogodef',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('eBathtub.com')
          .items([
            S.listItem()
              .title('📦 Products')
              .child(S.documentTypeList('product').title('All Products')),
            S.listItem()
              .title('📝 Articles')
              .child(
                S.list()
                  .title('Articles')
                  .items([
                    S.listItem()
                      .title('Published')
                      .child(
                        S.documentTypeList('article')
                          .title('Published Articles')
                          .filter('_type == "article" && status == "published"')
                      ),
                    S.listItem()
                      .title('Drafts')
                      .child(
                        S.documentTypeList('article')
                          .title('Draft Articles')
                          .filter('_type == "article" && status == "draft"')
                      ),
                    S.listItem()
                      .title('All Articles')
                      .child(S.documentTypeList('article').title('All Articles')),
                  ])
              ),
            S.listItem()
              .title('🔗 Affiliate Programs')
              .child(
                S.documentTypeList('affiliateProgram').title('Affiliate Programs')
              ),
            S.listItem()
              .title('🏷️ Brands')
              .child(S.documentTypeList('brand').title('All Brands')),
            S.divider(),
            S.listItem()
              .title('⚙️ Site Settings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
              ),
          ]),
    }),
    visionTool(), // GROQ query explorer — useful for debugging
  ],

  schema: {
    types: schemaTypes,
  },
})
