/**
 * 澶╀綋 GLB/glTF 妯″瀷璺緞閰嶇疆銆? *
 * 閲嶈锛歱ublic/models 瀛樺湪鍛藉悕寮傚父锛堝ぇ灏忓啓銆佹嫾鍐欍€佺洰褰曞悕涓庡ぉ浣?ID 涓嶄竴鑷达級锛? * 鍥犳蹇呴』鏄惧紡閰嶇疆鐪熷疄璺緞锛岀姝㈡寜 id 鎷兼帴璺緞銆? *
 * 璺緞涓?public 鐩綍涓嬬殑鏍圭浉瀵硅矾寰勶紙Vite 绾﹀畾 `/` 寮€澶达級銆? */

/** 宸查厤缃ā鍨嬭矾寰勭殑澶╀綋 ID銆?*/
export type PlanetModelId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

function withBasePath(path: string): string {
  const baseUrl = import.meta.env.BASE_URL;
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return base + path.replace(/^\//, '');
}
/**
 * id -> 鐪熷疄妯″瀷璺緞锛坓ltf + 鍚岀洰褰?bin/texture锛孏LTFLoader 鑷姩瑙ｆ瀽鐩稿寮曠敤锛夈€? *
 * 鍛藉悕寮傚父璁板綍锛? * - earth锛氱洰褰曚笌鏂囦欢涓?`Earth`锛堝ぇ鍐欏紑澶达級銆? * - mercury锛氭枃浠舵嫾鍐欎负 `merculy`锛堣祫婧愬師濮嬪懡鍚嶉敊璇紝淇濈暀鐪熷疄璺緞锛夈€? * - venus锛氭枃浠舵嫾鍐欎负 `vueus`锛堣祫婧愬師濮嬪懡鍚嶉敊璇紝淇濈暀鐪熷疄璺緞锛夈€? * - neptune锛氱洰褰曚笌鏂囦欢涓?`neptun`锛堢己灏?e锛岃祫婧愬師濮嬪懡鍚嶏紝淇濈暀鐪熷疄璺緞锛夈€? */
export const planetModelPaths: Record<PlanetModelId, string> = {
  sun: withBasePath('/models/sun/sun.gltf'),
  mercury: withBasePath('/models/mercury/merculy.gltf'),
  venus: withBasePath('/models/venus/vueus.gltf'),
  earth: withBasePath('/models/Earth/Earth.gltf'),
  moon: withBasePath('/models/moon/moon.gltf'),
  mars: withBasePath('/models/mars/mars.gltf'),
  jupiter: withBasePath('/models/jupiter/jupiter.gltf'),
  saturn: withBasePath('/models/saturn/saturn.gltf'),
  uranus: withBasePath('/models/uranus/uranus.gltf'),
  neptune: withBasePath('/models/neptun/neptun.gltf'),
};
