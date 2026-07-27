import { Suspense } from "react";
import type { Metadata } from "next";
import SharePageClient from "./SharePageClient";
import {
  buildSharePreviewSearchParams,
  parseSharePreviewParams,
} from "@/app/utils/sharePreviewParams";

type SharePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: SharePageProps): Promise<Metadata> {
  const params = await searchParams;
  const preview = parseSharePreviewParams(params);
  const ogQuery = buildSharePreviewSearchParams(preview).toString();
  const ogImage = `/api/og?${ogQuery}`;

  return {
    title: `${preview.username}'s Stellar Wrap`,
    description:
      "Check out this Stellar blockchain year in review — transactions, DeFi persona, and vibes!",
    openGraph: {
      title: `${preview.username}'s Stellar Wrap`,
      description:
        "Check out this Stellar blockchain year in review — transactions, DeFi persona, and vibes!",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 1200,
          alt: "Stellar Wrap share card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${preview.username}'s Stellar Wrap`,
      images: [ogImage],
    },
  };
}

export default function ShareCardPage() {
  return (
    <Suspense fallback={null}>
      <SharePageClient />
    </Suspense>
  );
}
