import { z } from 'zod';

export function validate({ body, params, query }) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      next();
    } catch (err) {
      return res.status(400).json({
        message: 'Validation failed',
        issues: err.issues?.map(i => ({ path: i.path, message: i.message })) || []
      });
    }
  };
}
