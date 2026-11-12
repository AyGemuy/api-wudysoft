import { PROVIDERS, isConfigured } from '../../../src/lib/oauth';

export default function handler(req, res) {
  res.status(200).json({
    providers: Object.keys(PROVIDERS).map((key) => ({ key, label: PROVIDERS[key].label, enabled: isConfigured(key) })),
  });
}
