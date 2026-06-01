import logger from '../utils/logger.js';
/**
 * App Settings Controller
 * Handles app configuration and public settings
 */

export const getPublicSettings = async (req, res) => {
  try {
    const appId = process.env.APP_ID || 'harchive-app';

    res.json({
      id: appId,
      public_settings: {
        appName: 'HARCHIVE',
        description: 'Plateforme éducative intégrée',
        version: '2.0.0-beta',
        features: [
          'authentication',
          'calendar',
          'documents',
          'messaging',
          'classes',
          'grades'
        ]
      }
    });
  } catch (error) {
    logger.error('Get public settings error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to get public settings'
    });
  }
};

export default { getPublicSettings };
