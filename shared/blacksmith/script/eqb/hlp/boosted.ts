/**
 * @Author: sheldon
 * @Date: 2023-11-29 23:56:54
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-30 23:21:51
 */

import fs from 'fs';

import EqbZapMeta from '@equilibria/contracts/artifacts/contracts/EqbZap.sol/EqbZap.json';
import PendleBoosterMeta from '@equilibria/contracts/artifacts/contracts/PendleBoosterBaseUpg.sol/PendleBoosterBaseUpg.json';
import ArbiOutput from '@equilibria/contracts/deployment/arbiOutput.json';
import {providers} from 'ethers';
import {Interface} from 'ethers/lib/utils';

const arbiProvider = new providers.JsonRpcProvider('https://arbitrum.llamarpc.com');

const allDepositedTxes = [
    ['0xeb7b72ba72b26c72e79d6e76b1711268f2e6dc6e8bf920ec54a597542fdcdd27', '0x8aecebbc1b147d9b2f441d74d0b7c412e95b6004fd17312e3d842d78d48e5b84', '0x6e3e1650df1437600c4ebf6aa694ef4169d286a0822d80ebb2d867ad77216118', '0x0e1a5a6a8bfff4ce83f94c87fe0fa6782c11fcbb0b36d601a1921527fc97f13e', '0x395df196141ae145868d982eaab6b640512d7600110dd3a048ee8948fbb1a9a9', '0xc5c926cfdaaf8e3d52409734ea873ab17412e915cd4d86f04111c09fb2028349', '0xc262590fbd1259e3a6fa5e0893acee15a8e15d594bdbdd980f11eb96e5516d7b', '0xc8a173e7cc3bd6d25b9449b35ee74a2fafa8a53837e59ff7459864584717d55f', '0xf93f54b1a81c80f81edaa99d2fffeb297da21995f6e78bf06884ceb3b05549b1', '0x05a260db1c1a43167f1dba0ed19cf4885c386b85932b9fed4b036040d88cded6', '0xca27c19c648968b623d78330f3158fdb873435d4b98010b4d46fc62cfcb424d7', '0xf972ea9f9f9a6be160f0de265047e008c53221f3021b78178093a128eb70d468', '0x59edb48e134e7d05e15c33c1205097bd43afa95ae4f3c2ad99ffb330ad4141c1', '0xaa69d5bdb0fff8f7411c55622bb8cb22bf1a29acb567dcc36e6cd79441444aaa', '0x3fcfb503f87f8ece8ef8a463f6bbe859d47adba75d733007666e4d5f59c1f173', '0xd8b7e23b79683a2e3105bb69b7ae274685938dc158e7af514bc8d6011e7aa8d0', '0x43581e40bf55b602b87ef2ff123a9e207c2e15910cda5ce219a06cc179c1238e', '0x051d160044bd7e5258685e3dbb24b80561fd3c44f933c913f23947fe77bf72e2', '0x6f5e6809b326be4a07b0c7ddf840f57e9784d663a50fb977acd3ba331fad7b7a', '0xc8d278327721e0854bd74870c95dacd9209cc5101e358d33b69e269cdc016f33', '0xe3035761aae98f737999a82a92cba1fc69238e539aa969b261361f1449072557', '0x5d68f5f1bee153999100256febbca26ab92aee2fcd570a55d15b1b4c22a8ebdf', '0x56a918bc3f548b2b7acf5e05fbe589757ee76e58e6c4522e1561a9018347feec', '0xf7b3da8f987a31542a02d26484881bbda4dd6ffa65bf69efd83118329a6a2f13', '0x7a78680d465cfe17f6dca1a6ecc6ef7c777925a3511b1e5451e50a87066cab3a', '0x2f768755b92651d58771ffbbf53af1c751519ec3870d32cfae2708ef7f784e0c', '0x648c0bf3d860e3b784a9f7ddd153a77e2590b2f8cd0af0d90a573521b0b1cb0a', '0x0dde4de9bbbf4833e5c43277530244280110bc9007e9d774d81e35e4c0b41eb2', '0xe6a7e1760c62a85605c7e0ade14da683dc28d86ca6c77776779f3edee43a6828', '0x999e50fc01e9ef1a00cee75ab9cb96888c2154e5dd9244bacd75aacb80c0bb6c', '0x285c4f1c9387095f012a22dabaec85d57eac0c1be2e274a6450eb95c92bbc831', '0x050517bd8be43431e48e677299a419334323ae07c8a8874c5c7b1f2b9e7add60', '0x3e2e557608af1e99e650d7e37f206cb92846d18fe4a1cd32333df2dfbc500c3a', '0xb6995d6710118308bd487257f913495f02157de3b9d73499d4ff81933c521fb9', '0x0a41834ca09f604120c33e3779c3d9e00c3d93eba6a25fe59a94a004e2d10033', '0x3a90ec295e4cde2580df88c9a4ceefe88dc91b9255b007801f8afcc9d4b75356', '0x180fe5aad03ea0d56fc665993929cb6c314e9c067e5f8a434020f60f32861dc8', '0x6e0a19583496a0ef3d230a00bd00456a75aeec9944a3e7a0e54078d580e9dff6', '0xee59e3f6d6f21a010e0388df692e95c67813998e90a54de847f20f82aebc1153', '0x15e215bd7ae93f77a9add388982d25f3648c13b6caf765bbe6a4d20b2a28fd8d', '0xee9315b441b4baaec4ce15652b2e247feb1999077b6120e673728414bbc31e50', '0xac9e961c0dc444c806425ffedbc141e3c5caee02cfd42f5c7483c2b845b8ca0f', '0x74df309e37221969ec9191261cf9b4fa73c77dfafcad8ed19114c35924b34102', '0xd7de9a0650fc433240a04563f3d183274a2b30af1323b8668db28efc22f913ee', '0xb5a3da6f7f68cd50aecef0806a4118ad2271175404b2e8c395b33a720cb6d437', '0x60fc0bc3338c0a707f6dac718e5be88a9ee0534d5969fb850f3ae7f17f66c73f', '0xe85e568857e065f18c3435dd3cddc456cc3bb98359d6ac49e9cfb7151725a22a', '0x5747eeb3f7bb7cfa0410515590b9af4e25ae9f30ab53c5a325a3bc50f406ce40', '0x2f02e101987703afcda90d26b4206b86aa014dbcbcdc0b5f985a89b6fbf02bf9', '0xd04f59fbe0d2a260862d85918a77769c8c56bb8bff87af55b6815c5765006a69', '0x6425286d04ce82734a04b07f45c63f05c4ffb5df83628aa2c66f48cd01774cc0', '0x6572d5ba3e34143dde347fe3d058343dad59bc0bbb7554c0d0294376759b7c19', '0x5e195eb0bec43a753e26b90ac15327218fc1b3cf63dd9190abe66fad576f0411', '0x55ae60fea705571a0262aa0a1af8fa8539f08a19d482eb288321edd278dc9285', '0xaeec0f542f39c6df2a23964fcce28ff6c885bf9c5f152b3a19be286c53627311', '0xfb20108c27fc116b92ee9dd613df5a6e8ac68dfd72e781db55d5650075ebb6c6', '0x0bcce6fb77d2826970a9d3e4625303844d549b7c0874445ae0efc1ed329187ba', '0xaf3ddd3fb9953d696907ffadc2a9da731b15b0ec03d144ec9a354ce7082c1bee', '0x4e3bd3fce7ecae2c7dad1f72db2ceab9ec408853e0fcea50f3df49ea4927c6dd', '0xc8563bd82f761ed762a38c8f2c34988bdd108440d7a467fae2cc5a734ddf6c94', '0xed05ea642707268d433c5c8438872e07c40ffc7e67c080f956751ec8769ad176', '0x6f5decdd9733941b6a7bf3b55d101769259a219686c0d8944f31f1e40fb0f41b', '0xeb20d98b54c1975ca667d8685a88122071a4361253213453f5734ab637f382a7', '0x5c0830bf1a5ba46921faaff0f7c96c6982daa3a4a9022740e92a23b1098a7b5c', '0xc8d4eb5ce6b46b89b78d6b4df37d211962a6fde3b13508fb013f39ed278cf5d7', '0xace31830912fb2e872dfc31b8fdfbc2139e353f2f346f75acfd979864b590884', '0x50cfda31f80d784d0b0e03fc7df7b13afbb58b2530757c4229514e0960d1efde', '0x404b46acd5c69b1356cd6c17757989497abb0dc6e47beecdc1a250d4256b63e2', '0xcb13f738d84521954d66a026002494f139c592ad623afa3668d5c333cb712e6f', '0x7be05cd0e910644b69cfbb73ba3a12baee67adfa57aa22802acc1628be8c8cdc', '0x46499503cfdc04d56526f9daa5ed02b3954d9ad0d8d129f617f988fadd8ebd9f', '0xa88762c33b704899e689031b4f13578dcaf57fcbe53287791b1a70c7c1b57877', '0xe268cbfc2b658d90c7ba3153cd8094119a4b15e7732a6cb555483b83262c760d', '0x43331f873a2b63c3ed238076a9996c02842a9ac93d75c81ddaa449fb11d4bd4c', '0x040620f80c9f12508814ffe8665e3ef376c792c53030afbea28651cd71948734', '0xf84077716604d17261bbf11c870d85983eeab5c929dcae23074a00f708cda8e1', '0x7540921cba9edc0b919e56bb284f2478554c5184e193549da3fe20a9f9b1e2e4', '0x14c80a329162c5ca343e7180d41cceffcca6363ae3483083a7c5e1eb0c48d2ea', '0xca49c1cfd0c7c75e5113afe7db5a7a4f223438b9bd62d3f04a0dbc046afd7ad9', '0x37eefd7aea03e30912397dd8fe8d086d47f31f3878858210bae7387c3c9ebc41', '0x31084b60cdbc3424c38ea4ce2d0bb44b98c2b1d9e9a855d9de84aa6717a18fe4', '0xf851995a1b92baa8c3403e241f18a77dadb819b1475b0c7a91d3bd3956bf79d7', '0x61eeb1f8bcbda494a3ccd90eb608258ac5b3d2f8a8f16b28f4beb6dc7d32799a', '0x21af8402248a9968c85c2d8e21c79871659a4356f9eb92041cc29ec73ffe756d', '0x0056228cdca7cbd1b02c0828c1ad2b92d13632811acdd2310a6bd9f8ecddb633', '0x03dd7b2f4a1b34d02b933736bdc706666c320ea771ca58685a0df1e5a14dc10c', '0x99151b5441d10806070ef7f0806f1eb383391cc81fff068500d4515acc8bd450', '0xa9c6998c62423481aa18717c6071d769e55a3a6f461ba85e68075742a970c018', '0xd83c8544ea1167150298e6ebf389041b8002b15c5ec3f3dc3b73ddce5c6e1612', '0x9aa515d2ff421c4c7a9771488dfc43276f1ca8d7d9dc9ff13a3bee1791b68e04', '0x6af1333fc3b73511b22e8b59a6de1493657febd93cb8bbc8b11721d95327151f', '0x1892d32f271787bdaeec47c32b34d28d427f60a84a391180cd71a3a66e3e79ef', '0x269eea98a01fa4bbf662e9ce98feb852a57da6d53a563284b6ae19b7a9eda6b5', '0xdd77d74eb6f7f18ebc86b11e452f8906a8825efb1046d3a080e50c8509f4e247', '0xacb1a47fdaec095932bd4788e7638fb3d9a8646077001a4cf6b514974bbb0cfa', '0xf1f00eab16c889ecbfb9e8685ed622b3085d11e91ffa01d94bd578744ea28987', '0x69c08b3617d576c43344c6f4ecb470528410d0f806b45d9328b97c0c5096f1c5', '0x10ebd3648d6cb7268d8cc83042f2844944b12b6789003a60421920a9fac3351d', '0xa880714a620eee97d7f54dee5e49b722be63af8c26da1e12503c6cd9d997f0f4', '0x9a4293dfa65b1efbd4a9bf2f8f110c43a476e51ecb0be1fb16fe78e2e49a4616'],
    ['0xa193691a09561a209605f58f98def42a0040384b27438419a179517358b7f0a2', '0x356904387d705d673fdb9f12ed491d75b793e6b107682b1cdc38a967891e7756', '0x87c8e09d0c4796666e449b0a727123742f24b17a713cabaea7077aa1143ed922', '0x488a6aee73067707ec5b17a588b4e7dadcde4011590c24f892e08837a079ce98', '0xceeca0e0426ea29e5b668550344222f53fa912b5598dbfd496e074316582207b', '0x9cdff70255528ad1f02e15ab6f35a0d9d1a10c0ecb255ee0d97f091a34e99697', '0xebf4bcf0e626f08ac26a798b9d8b75676a4ee2b943d95548330889707e723e18', '0x8dce94961ec7f793d8f39e768052b88b0ffbb31a4c74fd389632710273e4623c', '0xb24e9b7b2dbe0ad9821a2f0f1fb39f9d6ab442e8df80e0ca35aa98fa8fcdb344', '0x685df096af798f936dd564ffe767f3f8f9263a71f600376300da80958507e811', '0xfde20d3912bb1fa7380f157a99ccc2b2b53eb0df88a93a5577e7e5b8f75868c4', '0x551558c040fc69195fa0ef8c97884fb591bc4dd2dd441fe98645d30db19d5457', '0x0bc78e748d5d7723f230e8f995d8d7850cfe882f36b5babac87d3909afe70db0', '0x4b4f6e9a82195ba6729607ed012b7069a85ec00c829441537564392b2d7b7d7f', '0xd7320c97c390f9ce5b2513caea0063aa4b2db2cc602fe5d9ffeeb835a3f5f0d4', '0x4803b2abd327d64087aeffd74c26b8a8c1b15c569b28c7827ed7d6647c96b686', '0x56e0d2c4c4730a8153f9b9b56c574e0b637d7cf728ed814dcfbd0c04a79f0453', '0xe00a90e861614bc3262ab98b0b91f459199c70295567cee6760ba23fd65d5dac', '0xfeaed195de95277b6a6ed1a0aad1257190ae551407cfdc68e53f2bea4150ba2d', '0x29a5b06e9aa1a92350e5d3480edfcaee3aa5bdf8de66010fe79f5d44ed2e33b1', '0xa11e867a25eb4ce37a324800ea5b6e365646bf47180847d21926c2c61f424e73', '0xde1ff794778ea5a333c88c1a1a7d51117281d90b30b67ab2e41ea4daa5d94581', '0xc38e5423d49012b301ff55034b0aecfe4ac2fa6e51b40a0e15f64f679cdbaf68', '0x8ce4615163918379f51dd8b2933d3823f1897ab0b858edb4b721d0a34927e801', '0x6c077318bff6936d4bcc5ea5bb44e2c0231e2e33b94aad4b83b7f7ac161d046f', '0x5d95eac9c70452f685a52cdf651ae773f21c520172367a48f9646808ebbfb0a4', '0x2d432360595827dc8b3c892c6ab3c133f531f66be2a4809de57fa648384aa121', '0xaa1e8cff825907cc9743c502daa3be803d73ff20290053150ed607121c735d9b', '0x08e50d36cc5a3a1dd6897dc3a33260dc42aee3d3c815ccfc90e6a366fc56c2b9', '0x6219d354f2780a3d210ca7d9b2033caa804a148a2f8648fb799eb2ca4d70181f', '0xa071a13ddeacf93b6db87f1cf9d2d842a46cdedcca71e8b81297293bc3a0d4d4', '0x43a181958a692015a47d64871f979b571aa0d552a14482f6ffddabe7014e53fd', '0x9cad9e17284498722a51520ea74517d95aabb4885fcfafd38a253c4c6bb84d06', '0x591056ed6f5e7c802af039e57fc7ce76d4c5d6a0ed0cda927f6d9b40c85af6b0', '0xd4a2f21857627396ef4591dd8c0d3751ec3b0d2049f3ffc99748062078e08a8d', '0xd694afc20e25ecdc15c4d09a9be3436702b4991a43843bb1c060dac92e372d03', '0x73e358daa5242894f77724fe412f127f2762fdfe8bf55d5cd9017269738cbeac', '0x0e438c58d616d5a9430e0baff169f044a5cd75eaaec3c95a1c94f8a766b60e35', '0x900ef928bf4de9377088835776b1eb52c20bee74c1be7ad5ffc51dc8798e4f48', '0xd92222d9537f1de445d1444761b538d063e7d0097c6ed9ba991f158c9b5b1005', '0x9d8df95c49211a84189d4dba0ea17e3c6ce2517916c863acbdea6b2f97d357bd', '0x022454203b28c450da32d90975775c8431687f643f03f388175d34d816f85ad5', '0x8cf240953bb70bf82d329e2c08ab40f6e97d97d8461bd2ee7ef223d92090dd83', '0xf811ca301761d6e655d44ed4f3bc2d5348e2c4eddc88f2e8203ced21d53daf46', '0xe7a682e41ef00d0582a6811ec21f32a6bbb96074a020a00a01fed296c331427d', '0x178c2e7a8f784f7b1b528a4f5d12815d1f7f2977b3ce3853aca836890eb36fc3', '0xde279e570f8acd354a5a693bea338a764b11718729c4ab6cc4f9c1c3c93e6dfd', '0x3a7fa873e4b610f342bbf8db21557fd8967b01f20786f25701e2d45b4c62aa60', '0x41699c52d908a4c5a775ccb4eaf48b986205b92b7f6208f153cecac02d8bddc3', '0x8ff8735f110cf8865a63fc14fdfc7eca69dabc8fa993d17b89d6213bbb499328', '0x9114308b2d5b5a56fbe81d7eeca27b32e528b34d101f7aaaa455947e0a7554e2', '0x643fd09dac6b1bc63546ad95719cff3a8ace660254f285979877c79078fa4f73', '0xf72cd2e52ff91b40ca148d2a877e9e66eb170dd8d60250e0cb8a476ae712f139', '0xc83bc0f5d4ef4a9b570a5fd7b28b8fe852b712b702afc1d92646b95284f8d5ff', '0x673992410035af36bf039fd6c4915216a1860b16b77b80c77eabf54ad4934209', '0x893930023e043f6cc90139a68545d13c1498065e10c0a4a7682cb1468a939f86', '0x8c62e51af2a994181d76f8ab5ebb1fdb210a60f421c89e1334dc90d97e16f9fc', '0x47abdabd7d16ab2bfc04be3973c4db6847429dd1af984423583483eff655590f', '0xfa06dcd8688b04d8c9aaf4f7c1ae7d81a126b481ae6c45d6bc27a1e4f933de70', '0xcfd665a74ed57cd272df6923ba82572591dcebceaa909ec7cd248b162b83301c', '0xa6b02d5994019bb6d9027d81edc2a794f851af80562753112ad6286cb7ac26ae', '0x5b479344c7102119934dd12186bc0b1b9fa810df419fd05456a2b805af9b3be5', '0xa142d551f87e65a8d53ddc20fbe4d93de89171d1ff8c9746f08b4536b2a96ae3', '0xba2ce77f67ce37237e92b36324638fea94888cf1ef135ece1b40ae42943157f7', '0x0bdf780bd4e490278ac6530d2a02a9f2ffb224ca18b919525bc7727a89ce1c6d', '0xfac42c6640df8717cf9db4b91d2e8fc5d2da2f5fcbfbe665d640f42becbd03b0', '0x20c8f1b59d7f94db40f9fc99052c20beae384a6f148f114dd739b2daa3a7d577', '0x082fc3c0a801dffa39b461be8b41c63cdb903ba632ca7ed232b08f4914a1e308', '0xd63062961eae7f46e304f016a740c3779301e85e89b3c96be1dff0a292b62403', '0x7c4c0bda46be216ab9fc04889e3c903e7dd44ac1169f3c1458696d9a17caa26d', '0x1d7fa84f35afd07788ebbea2cf442625fb9a62e2b900adc31fcc84901721bbbc', '0x2fac63f5e56e9cb61268abcfbfe96afe42618654eca00849e3e63cdbd7077c5c', '0x10dd707304d69cdef63b648064fc5f43331944941d5bcc89a6bf469acaed77be', '0x0170c0b96716c43121dec0518beeddb79e055998cf70aa65ec0e4c17102915e0', '0xbe141873cc1dcf42cefc25bf29e79145e191748b445460c8ed505d90e5a537b6', '0x8f819585f715306c8d5dc76fd86c629177c7b65f9e55e973a78759857db068a7', '0xb8a99155025eb8b68a6c16fd18fd8e89638cd868aabf81567389a95dbe9b96d1', '0xfcad30dabb50da03bc3bf53eb11ef4a1a73c7494f4cc38a413b6cd033759acec', '0xac44d3bf23d30cb63b7cb014667e15c7b4953ef8adc14787caaf88b73e7c124e', '0x087cbf6c27efe5bee4dc858f9962d0cfb761454bb01c6614da965067b09da405', '0x69eeb1012e1dcbfff6ae1e0b23fe1e96e5a083a38078992bf01c5d1827ddd239', '0x9e6c1b75d33c7f5d4352bc4559c6867d1c6c9137f93f656690626a76cb89376c', '0xcb56be2d5be8de6f05bb17b0f11133315b7a794320ddfe095f0144337e515ebb', '0x0f5b92188841717adfa73f96d3961c865ea8b9b63a09c7adb52150e0bddc4bc8', '0x57bcfefa10da9380359d5518a13178785896a07a2f7ab399148f78cb2ab38f8b', '0xbeff225e370d6e8c757ffd5c95392f7bbfe45c355fa561c5ad58ef538a05f7a8', '0x3b13794d62d6c8e064deeeb7e29a4960034488ae1b92288a9340f3e6d8ca8b52', '0xd66c689c9ec03f1f086380d9aa7896d578cd0053226b6e7999a9a4a2be291c82', '0x093c9b9c73160e794f895e75ca03730f84238f572cb4409cd5dd917dc8f4fcc5', '0x79c146389739ea07f152dd19db6c2a997d9d34ebda2d23fdec2cb3fef5a27772', '0x9469e27b514c65d2551ff5147c2531c0b16eabfa17d8912b4fee022e9fdab6bd', '0x4c3de034f1446a34bb8d0b672f6a9bdba14ec695d601615f5bc249ae4c197a35', '0xcd0cce21f9e0de90469061e42a9dca0f5e599890592cc5cb4df0402618e42980', '0x832377b4ceb55927bb2bad600e49b1d9c005e5e4d4dead726beff392cd8a4fd1', '0xcb97f1c37a747c06c87497181ded07e8640cf7c699b1783926de07b9db232836', '0xec7084b173f8d45e01b7d32ef663b59ed6c4b42da004e24088a5efa8729b9dd5', '0xd4c4436e9477ae95b27f1c3134d7c9a5c09e4d52d7a32fdf4b4f5f95c138446d', '0x6540bbb712b13a25056ec92a4bdd181fffc855a892af51b840dace76eaba7f11', '0x04c915ac30727a4c0891484e4bdb4a1407e130ec5d4f50d2a39eaa558dfce7a9', '0x58a93ff55a27c3aa276a4f45e7faffc6b628686216f260e529973a9bc250330d'],
    ['0x235befb014ca036f2e6d0c6299ec1d7e5a4924c00b9aae7bfe9bc9c340681929', '0xfd65c930dcfc2282bc8a9fa8c8e181dca03edbfa669ddb1712deb21a0311600c', '0xdb53907553e8beebbf347bf7433d6c6525fabac2c476f2807addb5f763ef77eb', '0x3f585d4add9b544d17084ff4ef4c462cb6163d3a7351197b3521edb5f216fedc', '0x09f4f80719ff356ced57b4162833fb574983d70319ef0d80268b7f72018a6435', '0x4d601e51c32c991fc5fa3f792dc9b4e7d8fdb7a293edd9d36d0ad3f67d46671b', '0x26853ac5f2ba96b78313ea2456df4b62ef59d153d9fa84064730084eeda89248', '0x94a581bb384c4ff54e57f16a3b46545fc39663424df3ceac2f7a3e6f35227e0f', '0x56dcf6a22b6a1b0494906ed19a8ae3118694718b9d65af97d75c4c88cf23dd22', '0xfeb254772126c056d33fee0837e4fb73d987f90a7298ec547ecad15a63c97156', '0x8c61a548b9d5a2118447583b22f0a4c40dddd861523b7086148a4f6790448bb0', '0x6d46400c721eac7e2f0d46dea7c92f10dbe5a6174c15d6e00807c1c7437bb2e3', '0x7bf2ad4cb132e78ab636ccc80913416c5a6664b57f4eb8ca10a4adcad6c5fa3c', '0x9bb00a8a0847984b99c7af9f710bf536f4a82004fb63b4e0ddb7afc553332362', '0x9f9d016481285196834254f4e7b3e865650cd652d5743da7a6512b0440d9258f', '0xfa325fb34f22221a085f4a6ad34b772246a193504bc0f61522556657cecb4e47', '0xd57eb7d193ad85f1c29a08b94f4d28d54d640c2ded0de9b9564fd836e2b3ff34', '0xb5656695bb414b7a0990d1de5501f84779f734d4f32cb552be4ed28d4038b045', '0xff1d117852970ef5ae9e8e436691619bd5f90ecc6e01bc5b99b3787bd595c01c', '0xf51036550c8b8be9bcbe58eb2b3cdb60ce3f7221fe60221cb11980a00109cb0b', '0x848f7c30e83e938ff3e8397243009d432a3ca6133079d7d141a7fb85d7b3d38f', '0x6dbd4d310ed33756a329a7edfde86c2679d42b3829de56de0edaa031de52b8e3', '0xfdcd13fd30a4e5cbaa0ee731b0ab3a271e4d4d278567386901284d57e2548b0f', '0x0eedf9c890b4c419e2e2c219d808392586ccb10b8257f2475c4921a5c8c64356', '0x264dc5be343367b286d06b2347c7ad89c8b24f21b73cd3b368a9f758db338431', '0x821d00a4ad2904750e4907d0bf47cdccf29a6a310de93a6cf4a236de05b77abf', '0x7388e55fc91f46de944b9c687deeeedd7e9d5086ccb622f0bf9d9eb3831da76f', '0x901714837336f68b8f47482b56ae1c9078dcac64bbb853d15fddf7bbcf59e275', '0x92bea31f77d0c6af4e59ae6248ccc1cae377f6294964c6d5fbda821559445c28', '0x37b9330b6219b3110633d76c065d05760cbafc03107b06c50c5da4ee0835ed41', '0xbdcafd6e8bd18585adac437a85496dbfbb8829aa06b8e3ffe9bdc34b7aed9f62', '0x065a4886fd72fc9d70b5876dad53a410194cf203f6513ee758ff4bc9a37b29fd', '0x587c178745fdc3d8027e228672d5731cccfb3cfb34e1b60547d4ead8e2fc97f8', '0xd404eb3b557c26a2fba8a3d617d489949ebef83c7b4d217bb15b9a798cdb7794', '0x3aa9094d354f10cdf8d2cafebbff9d33b9b507757afe087cf39638566c18f36c', '0xf8d16a7f7c28e962a9134ca6c5a318d0e9104c7b67e449d1afac8f174e0fcae4', '0xd649779b8e90dab403cc3cfa24f0c6aaa8db244741eb72c3d5c5ee89daa83809', '0x6f2e9eeb0b8d6e4dd2972382ccf3b386b8eaa0bfc5f44f687749b3b8c6b62a87', '0x6f229374966d70013d5a85079462e0efd21aa31ed99e24dcee0eb6cf6f4a8591', '0x4652baa6b9fe7f9965593f8e0af5b9f0bdb0260ba8bb04cc394e9bced732fa48', '0x13e6d8f7f41c0bcac15530e1e2155b920e2f6232c709029b0c2e5d033d3d6116', '0xea8012890ea3105d3f49cc453625f86af9a9a5cfdf72709faefb594d6a421b24', '0x86e254ca547ed0606add8c8ca833a9bb2bbd6b58fb743ac27190556ee3d349d2', '0xe9bb8b8a67769308a0cec463c1cb2da54ef3273974b015a5b8177efbaf063a42', '0x2abade16cc2192135d1ce3ea7c19e934c2865d7da4c53ad5ee4a585bd1ff0f62', '0x49833be70ac4b326f81f42e8dc0e1bccb1d7e51a8233b807b835904e30d1f65f', '0x848641e19d8895c118a99786d50403583a06d6dbf8bf43dd3362da9c866874fd', '0xe2e0506c050187f2c622282372c4b08d6cfe36bdb6e6d6a966c881f83970017c', '0x88ec9d6ab64d57749c7a0853910099e864d32d6e5e260c59103f099da1e5dfed', '0xd04bdd1fd07a8fee4c907bac878eb87128be6ba681fc35c24ec0555cfef57e0d', '0xc3fc3d31a32370030e2ed14ad22bc3fedfce312d91faac4fec423b34e230d412', '0x7d17875fc4047b113cb8a7b866fbe6f5529a08b88e6195645eef6f847d3f61ac', '0x0099a94e4fe16855ca8189422ec2420498e4ea93b11183d362d9745c2c400f55', '0x69c81a152321e776f1b274aafce534ba35b5e8f1307311ae6d2041bb79f76468', '0x442197dda894472f23d25aff342e16668ab4ec4b432296869e2c953c015395bf', '0x9e408eadde875eb00fd321ac2021fecc2dfd2f8dfa738febadbdb0b6713acac2', '0xe863dcb87c4a8a52f2bf07becc842e4d2db9e390d9dafa12ab274263a79ba638', '0xeb6a8ac2f7be6143829be62fd0252691fd3ab79d3526ace69307fe0dee72c5b4', '0xa0198d36b28ea56d1537c4b78a98cc6c57777dff405fbea7a1be9f0d4c03c2fe', '0x96d19b5523706a5c2306f80768aec597e452584c9afccb456d9856ae7d660787', '0xda477ce5a0be9a9c3e9ec188afa95c18b9ff524e00facacef133632a74ee0679', '0x1a59444b77f9d5a9ba8fb4ebfce37dc3839448d855492a3358a13f567f3659c2', '0xf148b4e5ff7cff7e874ee0a880a0406a780cd7f65f11830916697c68db5e2ad1', '0x7b5445c8df63733e477dff897c81bbaba8d1c3b7aa163629be747c3502f00f24', '0xff719653b3a489b867f3d4ef4c4d466cbe4bdad195863aa99ee41903c9a3ee92', '0xe63c4984ac26da31325e0fe30f4ea121a553a41f8baf4c7a672b8d01f2b6eb3f', '0x497540275cc60ee8097482a8ed027df45a2102b38ba090fe48b19fc412f54f92', '0x02c67569468f82198514a7f91cc6662409062e708fe72f2510075b1e04da5f72', '0xd80a4037b50368c79041843b68ba1fb5eca58ff8dbeccec0119f43bbef732409', '0x65e32989832009372fb719fe18cdcb87d8a9257fb2c6b3f024250b5bd19a1757', '0xa92851385a78f57773973faf609be5a08eee5f97733c603ec718e895374b4dee', '0x3bd7d7428a5b558810e8fc67228c894004dc61003751b8691aa086de6f429bb4', '0x0ba7586d56e7c8800bd80fd2f75b9b924bb0556b47535930b72189bf47d3aa09', '0xc98bc18c754e25e35e0f7a8325b8f266f00e9879c057ada915912d23eb7682d3', '0xe37cb0fc3107f680983b5162658438205c21b774653cd18c4707e772e072e52b', '0xcb9ead2cd42302f245e87ce7b82885677440eafee4c16156456e0024b24a95af', '0x7c1b6b098d2f39d8c9826ac52924fc5d3585a8b454cf7429be3d110a9d3f2398', '0x12963fbaa9a7e207a76c57bedba73ef381afce89ded1f50f1e1c785cb81b99b0', '0xa6ab639513d81d6a98c63aff4b8e9d438881a194057c4f5c350a3321536e474c', '0xf8ad9034071aa766c01100c28e276e15e9c14854cf20e9a924e134c759bb1d6e', '0xcbdf72e8287be85082051e8257dd9adfaf660eea893df157224b937388e42cc0', '0x929c448ef300ae68c5e6afd35fe5c76e38ba10dd7d7465a7be4718708241bb97', '0x71dd5ed9beb17df8908988b9730008aeaadddda2b1430b624f8d58f4f3bb7423', '0x1e67d0609eb4c0d822f061275c7b842966dd01cb8257f11b2d7c7addd3fa2f28', '0x58ec89756fb737d31dfc86d21a3219cecb3de05d69a2cf6a4ef20e52fa007901', '0x877322ae9f3a8ed37cb92af9a58cf00e453f1bf8fe3a00b74e78c277df98a03e', '0xfd41eafc44d3a298f8fb581903b23d7a13182d7e95e9079dad26be931148947b', '0xb1d8f2efd8a16ff0ddd0112208933d9af50d536def9c12e1a8c4606a80acc89c', '0x50f408160c951007419eea88ed809b9efb9d50e8d67a4552fa4f51a1cf57feba', '0x0cd750277f5f474ff9b9694df3ee69374e338f760bd1318acb1beeaa0eac859a', '0x993f9cad862264bef7d6864bfc4c3f0829c3b4326d21f83c8b80fc6786387c23', '0xfbc19ade0a60f2c1ed4afdb58a2fee703adfdbebd4f998879099c70d0667ac75', '0x69ed12bbb9820244f7b0436ea0a5b96856a3a01583ced682f4a7bede05c01267', '0xd5e5e45ad5c9a28c2c5def1619a86721670d2182bd92efedef375edd1c4a2e70', '0x5a11ffd21e2f40d7de196f150bad1accc6e6a3ca23a88da40bf5813dd038ac3d', '0xb4bbfe23062b48a3cb7a41e0a4b7eabcab77b812b26a53e431a436b134c5632a', '0xf2b268c726b538976dca40edcba670df6090304ec1bc8a07e89bed495e7dbf04', '0x05607aabff7efbd21b073a46aaaace35951ec896a43ef263caf2d9a1bb6cf10c', '0x58ac77de38fdcaf6801d08b37ee6ed11f51a3258df0b75ccbe73116ac39c58ee', '0x8f935e894367884c216a07718609df7f7efd9ee31824cfd71b57d671a4913551'],
    ['0xb0545e8e899f171261b019b51834fef57f74d2410a8ed76d0065435754122c72', '0x766547b0af988298092c31db70cd547df33f26ec15e5e1a9c7c119476ac092be', '0x39e9cc553ed0c6c1a75b64cce583c143a5fe3df3eafc86906fc6792e0ccbb34d', '0xf75a5c6cc33bc1ec2687abe3c8cd8cb9ff4dd34af1372e65b1009c672b8aea60', '0x107c4ecfb6f11073beaad75dd57b5d97aecff4febda79c1d41f292300ae7211d', '0x649f64604a05dbf17426b2bd21c0788cd44c0037f719e8c6cf361769ede48497', '0x9cd6a4403bb0ec82e94cea868560675fb776b049c4c757e6bbd9bd38cc8c0130', '0xb2fdf929ba4103b715848b2e4396a692d7c294756854d14c0ffe5acbc2420c39', '0xd0cdb55d48e18ca43989c5ead6295c581d871472c7997872df50302c9099bb19', '0x21a00c10e6ddba56209eaad6eb2ba5111aacb9b41747e799fa006c17444e39bc', '0xd209fca3d7b5ef803844dc4344838c7534ad08c94326d1ed1576f7167b5de219', '0xad6dc82ca800b7486472dd5e2cfc1be1367bebef4af097deae937e5112393071', '0xe3213c08caa3faa3dbaf4a88def737c91806fb1553ba91ffb072e9fe4747565e', '0xde4d4c167b5294f7e82da4336bdd5b23e1bd390c4972359908fa230bb9db8d39', '0x141e3a7c2e8d1e399eb8cc2a9af6721722552edbcb91e3408732e384ccff0142', '0x2cb079cfd53a058d57d5dec0aacfc906cf820ff4e60cb5cc87864acddfba1f50', '0x4e53361d25e573294809d992657945618f210c5592e6a444796deb65177ac261', '0x8b85ae02c0ccf322921638e7203327dee2af2657d40baeed898f43f0d47034d8', '0x47277652811fc1df8830c0fb4a5aaa31af6b0630dd15cdb02415df196d8a8ff2', '0xa1187f295253e7500187344c2eb9ae0886ba19c197d7b47557d1b860ae47d437', '0x7ea3ccb64c6e7df795010e6ae1a8a3c96072fae727e0b9b66e9a9ed6a70ea694', '0x16728cfdce91e52b2ef9cf2f32df63c8449351f38dcd87d85f0c0baddde4f33c', '0x17475a517c550181ca4069e95314a4eabc00cb53ec26f454d9b0e9968771fa4d', '0x82d2c9ae0a238c9c0857333ae5f4ed695da55360a3b9432e52729df9ace83a58', '0x46b8a3b0702dc9f0ff95775fd73697673a8ffb44a70012ffed4aed80b701136c', '0x49abdf98a78014cbf81ccfa6b1981e5f6c3383fe164f5a2040ea160f9b57a3ac', '0x4c409e0234819a6ae2396c62f53e91baa34d6bd045f0d93ec7a25303cd7cdf8c', '0x38ee211f984c7eb12d0f45f77be306df5eefb95ece57cf9819ff566a81d1f85d', '0xef698dd0f04234d8c14cc824720139087025ac3c16f87d00d90acf07356757bd', '0x4903d51c56d571eb7043da43fa5869b0878b5ed62536c0bf8fca451dbdc8f355', '0x9faf93770e31857b84328cf59a9c2ce77e8d09127046d6c7a1e7cb3ce930f885', '0x5a24845354b1fc5ed6fb07e68ae036b983a8d153b955a7a6a88150ac4265ccf6', '0xcebeab89e8e24711bbed97e57cc737eb33ebb9799c1aad40cfdbc7122cf4f266', '0xd650f7c5179c289d248ac1800fb1dc1a39b9d7e4c283a42d696406ab993737e3', '0x4d02a977be333308c683709da3145b5b0aaf9ae2b73f11f068080a16f7cda168', '0x41026c02966ea3f65a13eccb4b5498192336f32cf55f24aa914f1d380ff44dc6', '0xa68ba8049a76ce67398ce398e6f70e335cd4d4acd59817b724f37338f50e3db5', '0x6b898e315a746a7e84c5ae38fcead4bf6a6b8df4c701fd3bf4eea43fbba4d119', '0x321007d8979f1ed83634e7fd7e9808ffb4907e1f129e257cbe26be13fac1dece', '0x996c32705e9f38e4dfe63edcfbeefc20e8b539da95fdb7b98c37819737e2b2ea', '0xfb7306fbf9968bcd7e620d40ef687d598903b93179850f3434db0f829328b80a', '0xbfe346109132da16bfccae86a035fd4138524a6072c53896ce7587f4e8a1430f', '0x4f4a0362e530b762bb7d48bca3a73ddb6c0f07c318db0e5ff69ad54448d50173', '0x88976cdc9b2713ca9501343d9ef2ad6c5e1ee7a3c8ddbd0668527fedb63ce97a', '0x5ec7a8ed31efcea10cf68385c42f46fd4f124b74211238fe8b19cb6cc5ed9af8', '0x27ea9b8e061fc4a10fb265c7a4c6e3e32640749b845db0394bb6ab52925dab65', '0xa53ac3ce31061a639d5c7e0c620d6b9ae725b2ea578d1563ab589c2c0afa9d64', '0x2bb50969c416b8c5004b62c526125f8d90a3206d96680e0d3ee003a145505cf3', '0xb64bb696fac192e638840066ae6b90da3b432deec6dfa1eb976dd0306019361f', '0x39f9033d77430177e8cf13344c974d3d523ef488ac65996783244e5ea4c5004d', '0xfb52fd455c301cf0c1774a0b11cdb018453fcb9b44d95f706e4e2562b9cd93a5', '0x9b8e8512bf5f24109e14c1b580b934dfee25a11b7a13ce61351eaadfa5e8a4bf', '0xcbfd75f39b4a010ff2c5b01ccf1ec7a40334e1796b74509a97c2f048b59002d3', '0x09620af9104f7b69005242c166e8503d1d7dccda51b50299862dd821720832f2', '0x9208c54b63240097be1da02ba707cbb23307b19c9a533df35f610cf378b55188', '0x5b11b06e70c8c2469ff7249ca85bc4fc549306c42e84713672c7fc99a9afc512', '0x6015995c21db39ee9d9ef97b04c6aefc15c4f6008c081f82e1111d3eedd547cd', '0x02591a0646eab77ef7f6cbb1fc63d5fad528a811e4040308390c4d5b4f114b75', '0x75c6c549aa163b96f06a011ec71b8a7ecffd67a3b3bec9e9df0d6c01cb2d94d0', '0xe9a0975070be4fa6a67a0ebaeaa3275d9ee396ed7a3612ace6cee9ff1367a6e4', '0x8b60346a3b4f5978025a60fc0bbc53dc91509eacb6f4b104077fea6d48b53eba', '0x37f14942931da855718744d1cbf76875921989ae6e92460d7d38251ccb84b8b6', '0x9c2c658901610c0bae4eb57e914f6562f4aaa2e1ae6d056dddb60781116b8fc0', '0x43d33947ef91b038fef5f54f121358cc0968cf1bf006e0f0d7ab55cf07e6e1ce', '0x2efa0ebaf61a680f6be2e43e523df06f3e4056e111f62d61dafcd5ede1d38036', '0xe5a736fb323a77b4ca4868b9f3aa7044c53484727963f223ef0e82bba24ac0a2', '0xfb7fe6a1e6fc371d8cdb97cb1310de860584f3810bdde8432f66d84441d29dd7', '0xd6c0ac5364bd8348302445a4f3290cc836c4a46c1a6eb47910b1631bbd6b2a75', '0x54f235be11cd0598769e9d43972695a751cc39929b9204f4a6c9926a7ed1dce3', '0x3fe440597eb818d19414bad947f6a69f35f76c96d4b49960d88937655254fd26', '0x0edaff0003c1170d1290f5a96532752e4b0788c33befd3e84b3023837dd3f41c', '0xe46dded072bfc39c74a1cc34c6dead49fc796b623d62081b0e91c4d5cdaddfd0', '0xfb43610fab650b8939df27ef5595d7dc071ac8c3250b2e7e5fe7bd123bc37b06', '0xa1efb1baef39c59d80713bf704834bb6497b4de605aedd449b91c9c42bdaaccf', '0xb0504a3f5189a2af52560b686733779507c353fe8d5d1040170defe1613008b4', '0x2a3733db9628dfad476a759189bba538a22b990bc994c345e451e094a1c9b5c5', '0x5bbcb88a0f6f41d95dae2a9ea83686e2783a31550c36a1576b98d95a49bde189', '0xc3f75729b902767ba98b397b92b75cf7262025398cb85b2f3a157f7686b6cb11', '0x48a5ce211401a159d1bd410dcd626178b9e32dbef0f8d8e5c96f4a7c5c90e41f', '0x2ab11d3d168914b3b6a52c7f23e6e6684ecd99e420e1ba242f835784ad97649c', '0xb12ff7d9bc85a91b802f2a7bf9bc728d6a0aa408c4e7a9794e9f28d911bbd061', '0x6b136458427732790b72baaff18582a29ff7556d2ef4a5ea47b70c85ab75117a']
].flat();

const interfaceMap = {
    [ArbiOutput.eqbZap.address]: new Interface(EqbZapMeta.abi),
    [ArbiOutput.pendleBooster.address]: new Interface(PendleBoosterMeta.abi),
};
const HlpPoolId = 11;
const startBlock = 150920501; // 2023-11-16 08:00:00
const endBlock = 155481031; // 2023-11-30 08:00:00
async function findHlpDepositors() {
    const hlpDepositors: Set<string> = new Set();
    for (const txHash of allDepositedTxes) {
        const tx = await arbiProvider.getTransaction(txHash);
        if (!tx.blockNumber || tx.blockNumber < startBlock || tx.blockNumber > endBlock) {
            console.log('Invalid blockNumber', tx.blockNumber);
            continue;
        }

        const parsedTx = interfaceMap[tx.to as string]?.parseTransaction(tx);
        if (parsedTx) console.log('Boosted Depositor', tx.from);
        if (parsedTx?.args._pid.toNumber() === HlpPoolId) {
            console.log('HLP Depositor', tx.from);
            hlpDepositors.add(tx.from);
        }
    }

    const arr = [...hlpDepositors];
    console.log(arr);
    fs.writeFileSync('./hlpDepositors.csv', arr.join('\n'));
}

findHlpDepositors();
