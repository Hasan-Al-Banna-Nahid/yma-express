import mongoose from "mongoose";

type QueryStat = {
  count: number;
  totalTime: number;
};

const queryStats = new Map<string, QueryStat>();

export const observeQueries = () => {
  mongoose.set("debug", (collection, method, query, doc, options) => {
    const key = JSON.stringify({
      collection,
      method,
      query,
      sort: options?.sort,
    });

    if (!queryStats.has(key)) {
      queryStats.set(key, { count: 0, totalTime: 0 });
    }

    queryStats.get(key)!.count++;
  });
};

export const getQueryStats = () => queryStats;
