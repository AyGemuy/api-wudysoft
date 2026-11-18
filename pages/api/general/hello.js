import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

function handler(req, res) {
  return res.status(200).json({
    message: "Hello, world!"
  });
}

export default withApiLog(withRateLimit(handler));
