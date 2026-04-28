import { notFound } from "next/navigation";
import ProductListingPage from "@/components/listing/ProductListingPage";
import type { Metadata } from "next";
import type { Gender } from "@/types/database";

const GENDER_META: Record<string, { title: string; description: string }> = {
  women:       { title: "Women's Ethnic Wear",  description: "Sarees, kurtis, chudidars and more." },
  kids:        { title: "Kids Wear",             description: "Boys and girls ethnic wear." },
  accessories: { title: "Accessories",           description: "Umbrellas, purses and handbags." },
};

interface Props {
  params:       Promise<{ gender: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gender } = await params;
  const meta = GENDER_META[gender];
  if (!meta) return {};
  return { title: meta.title, description: meta.description };
}

export default async function GenderPage({ params, searchParams }: Props) {
  const { gender } = await params;
  const sp         = await searchParams;
  if (!GENDER_META[gender]) notFound();

  return (
    <ProductListingPage
      gender={gender as Gender}
      title={GENDER_META[gender].title}
      searchParams={{ ...sp, gender }} // ← pass gender explicitly
    />
  );
}