import mongoose from "mongoose";

export const enableMongoosePerformance = () => {
  mongoose.set("debug", (collection, method, query, doc) => {
    const start = Date.now();

    return function () {
      const duration = Date.now() - start;

      if (duration > 100) {
        console.warn(
          `⚠️ SLOW QUERY (${duration}ms): ${collection}.${method}`,
          JSON.stringify(query),
        );
      }
    };
  });
};
enableMongoosePerformance();
