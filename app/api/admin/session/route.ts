import {isAdmin} from '@/lib/server';

export async function GET(){
  return Response.json({authenticated:await isAdmin()});
}
