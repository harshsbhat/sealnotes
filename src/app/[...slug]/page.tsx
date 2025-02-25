import { redis } from "@/lib/redis";
import { DecryptSite } from "@/components/controlModals/decrypt-old-site";
import { CreateNewSite } from "@/components/controlModals/create-new-site";
import { sha256 } from "../utils/vault";

interface NotepadPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

const fetchData = async(mergedSlug: string, siteExists: number) => {
  const data = siteExists ? await redis.hget(mergedSlug, "encryptedNotes") : null;   
  return data;
}

export default async function NotepadPage({ params }: NotepadPageProps) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { slug } = await params;
  let mergedSlug = slug.map((part) => part.toLowerCase()).join("/");
  mergedSlug = sha256(mergedSlug);
  const siteExists = await redis.exists(mergedSlug);
  const data = await fetchData(mergedSlug, siteExists)
  return (
    <div>
      {siteExists ? (
        <DecryptSite params={mergedSlug} encryptedData={data as string}/>
      ) : (
        <CreateNewSite params={mergedSlug}/>
      )}
    </div>
  );
}