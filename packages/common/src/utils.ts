import every from "lodash/every";
import some from "lodash/some";

type Filter =
  | {
      q?: string;
    }
  | ((value: any) => boolean);

// Borrowed from https://github.com/marmelab/FakeRest/blob/8397d21b8c8e3a847f80a362dddb1da5cf5a0f5e/src/Collection.js#L5-L81

export function filterItems(items: any[], filter: Filter) {
  if (typeof filter === "function") {
    return items.filter(filter);
  }
  if (filter instanceof Object) {
    // turn filter properties to functions
    const filterFunctions = Object.keys(filter).map(key => {
      if (key === "q") {
        const regex = new RegExp(filter.q || "", "i");
        // full-text filter
        return (item: any) => {
          for (const itemKey in item) {
            if (
              item[itemKey] &&
              item[itemKey].match &&
              item[itemKey].match(regex) !== null
            ) {
              return true;
            }
          }
          return false;
        };
      }
      const value = filter[key as keyof Filter];
      if (key.indexOf("_lte") !== -1) {
        // less than or equal
        const realKey = key.replace(/(_lte)$/, "");
        return (item: any) => item[realKey] <= value;
      }
      if (key.indexOf("_gte") !== -1) {
        // less than or equal
        const realKey = key.replace(/(_gte)$/, "");
        return (item: any) => item[realKey] >= value;
      }
      if (key.indexOf("_lt") !== -1) {
        // less than or equal
        const realKey = key.replace(/(_lt)$/, "");
        return (item: any) => item[realKey] < value;
      }
      if (key.indexOf("_gt") !== -1) {
        // less than or equal
        const realKey = key.replace(/(_gt)$/, "");
        return (item: any) => item[realKey] > value;
      }
      if (Array.isArray(value)) {
        return ((arr: any[], item: any) => {
          if (Array.isArray(item[key])) {
            // array filter and array item value: where all items in values
            return every(value, v =>
              some(item[key], (itemValue: any) => itemValue === v),
            );
          }
          // where item in values
          return arr.filter((v: any) => v === item[key]).length > 0;
        }).bind(null, value);
      }
      return (item: any) => {
        if (Array.isArray(item[key]) && typeof value === "string") {
          // simple filter but array item value: where value in item
          return item[key].indexOf(value) !== -1;
        }
        if (typeof item[key] === "boolean" && typeof value === "string") {
          // simple filter but boolean item value: boolean where
          return item[key] === (value === "true" ? true : false);
        }
        // simple filter
        return item[key] === value;
      };
    });
    // only the items matching all filters functions are in (AND logic)
    return items.filter(item =>
      filterFunctions.reduce<boolean>(
        (selected, filterFunction) => selected && filterFunction(item),
        true,
      ),
    );
  }
  throw new Error("Unsupported filter type");
}
