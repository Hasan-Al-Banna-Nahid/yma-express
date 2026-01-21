import mongoose from "mongoose";

export const optimizeMongoose = () => {
  mongoose.Query.prototype.exec = new Proxy(mongoose.Query.prototype.exec, {
    apply: async (target, thisArg, args) => {
      // Force lean for find queries
      if (thisArg.op === "find" || thisArg.op === "findOne") {
        thisArg.lean();
      }

      return target.apply(thisArg, args as any);
    },
  });
};
optimizeMongoose();
