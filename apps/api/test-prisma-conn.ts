import { prisma } from './src/config/prisma';

async function main(){
  try{
    console.log('Attempting prisma.$connect()...');
    await prisma.$connect();
    console.log('Prisma connected successfully');
  }catch(err){
    console.error('Prisma connection failed', err);
    process.exitCode = 1;
  }finally{
    await prisma.$disconnect();
  }
}

main();
