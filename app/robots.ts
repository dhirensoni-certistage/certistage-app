import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/client/dashboard'], // Disallow API and private dashboard
        },
        sitemap: 'https://www.certistage.com/sitemap.xml',
    }
}
