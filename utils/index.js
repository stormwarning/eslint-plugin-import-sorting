import { builtinModules } from "builtin-modules";

export function hasDefaultMember(module) {}

export function hasNamespaceMember(module) {}

export function hasNamedMembers(module) {}

export function hasMember(module) {
  return (
    hasDefaultMember(module) ||
    hasNamespaceMember(module) ||
    hasNamedMembers(module)
  );
}

export function hasNoMember(module) {
  return !hasMember(module);
}

export function isNodeModule(module) {
  let moduleSet = new Set(builtinModules);

  if (typeof module !== "string") {
    throw new TypeError("Expected a string");
  }

  return moduleSet.has(module);
}
