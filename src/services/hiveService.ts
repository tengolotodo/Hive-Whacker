export interface HiveUser {
  name: string;
  avatar: string;
}

const HIVE_RPC_NODES = ['https://api.hive.blog', 'https://api.deathwing.me', 'https://anyx.io'];

async function callHiveRpc(method: string, params: any[]): Promise<any> {
  for (const node of HIVE_RPC_NODES) {
    try {
      const response = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1,
        }),
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.error) {
        console.error(`Hive RPC error from ${node}:`, data.error);
        continue;
      }
      return data.result;
    } catch (error) {
      console.error(`Failed to fetch from Hive node ${node}:`, error);
      continue;
    }
  }
  return null;
}

export const searchHiveUser = async (username: string): Promise<HiveUser | null> => {
  const accounts = await callHiveRpc('condenser_api.get_accounts', [[username]]);
  
  if (accounts && accounts.length > 0) {
    const account = accounts[0];
    let metadata;
    try {
      metadata = JSON.parse(account.posting_json_metadata || account.json_metadata || '{}');
    } catch (e) {
      metadata = {};
    }
    
    return {
      name: account.name,
      avatar: metadata.profile?.profile_image || `https://images.hive.blog/u/${account.name}/avatar`,
    };
  }
  return null;
};

export const getTrendingUsers = async (): Promise<HiveUser[]> => {
  const activeUsers = ['hivewatchers', 'acidyo', 'lordbutterfly', 'tengolotodo', 'ocd', 'pharesim', 'erikah', 'aggroed'];
  const accounts = await callHiveRpc('condenser_api.get_accounts', [activeUsers]);
  
  if (!accounts) return [];

  return accounts.map((account: any) => {
    let metadata;
    try {
      metadata = JSON.parse(account.posting_json_metadata || account.json_metadata || '{}');
    } catch (e) {
      metadata = {};
    }
    return {
      name: account.name,
      avatar: metadata.profile?.profile_image || `https://images.hive.blog/u/${account.name}/avatar`,
    };
  });
};
