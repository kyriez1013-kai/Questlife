// HealthKit's Nitro runtime is iOS-only in QuestLife. Android uses Health Connect.
module.exports = {
  dependencies: {
    '@kingstinct/react-native-healthkit': { platforms: { android: null } },
    'react-native-nitro-modules': { platforms: { android: null } },
  },
};
