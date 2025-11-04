export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Only validate req.body, not req.params or req.query
      // ID comes from params, not body, so don't merge params into validation
      console.log("🔵 [Validate Middleware] Validating request:", {
        method: req.method,
        url: req.url,
        body: req.body,
        params: req.params,
      });

      const result = schema.safeParse(req.body);

      if (!result.success) {
        console.error("❌ Validation failed:", result.error);
        console.error("❌ Validation errors:", result.error.errors || result.error.issues);
        const errors = result.error.errors || result.error.issues || [];
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.map((err) => ({
            field: err.path?.join(".") || err.field || "unknown",
            message: err.message,
            received: err.received,
          })),
        });
      }

      console.log("✅ [Validate Middleware] Validation successful:", {
        validatedData: result.data,
        dataKeys: Object.keys(result.data || {}),
      });

      // Replace req.body with validated data (passthrough fields should be preserved)
      req.body = result.data;
      next();
    } catch (error) {
      console.error("💥 Validation middleware error:", error);
      console.error("💥 Error stack:", error.stack);
      return res.status(500).json({
        success: false,
        message: "Internal validation error",
        error: error.message,
      });
    }
  };
};
