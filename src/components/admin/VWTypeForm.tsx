"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useEffect, useCallback } from "react";
import slugify from "slugify";

import { vwTypeSchema, VWTypeFormData } from "@/lib/validators/vwtype";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface VWTypeFormProps {
  initialData?: Partial<VWTypeFormData> & { id?: number };
  onSubmit: (data: VWTypeFormData, id?: number) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export default function VWTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
}: VWTypeFormProps) {
  const router = useRouter();

  const form = useForm<VWTypeFormData>({
    resolver: zodResolver(vwTypeSchema) as unknown as Resolver<VWTypeFormData>,
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      sortOrder: initialData?.sortOrder ?? 0,
    },
  });

  const watchName = form.watch("name");

  const generateSlugFromName = useCallback(() => {
    const currentSlug = form.getValues("slug");
    const currentName = form.getValues("name");

    if (currentName && (!currentSlug || currentSlug.trim() === "")) {
      let newSlug = slugify(currentName, { lower: true, strict: true });
      if (newSlug.length > 0 && newSlug.length < 3) {
        newSlug = "";
      }
      form.setValue("slug", newSlug, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [form]);

  useEffect(() => {
    if (watchName && (!initialData?.slug || initialData.slug.trim() === "")) {
      const currentSlugValue = form.getValues("slug");
      if (!currentSlugValue || currentSlugValue.trim() === "") {
        generateSlugFromName();
      }
    }
  }, [watchName, initialData?.slug, generateSlugFromName, form]);

  async function handleSubmit(data: VWTypeFormData) {
    await onSubmit(data, initialData?.id);
  }

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Beetle, Bus, Ghia"
                  {...field}
                  onBlur={generateSlugFromName}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., beetle, bus, ghia"
                  {...field}
                  onBlur={generateSlugFromName}
                />
              </FormControl>
              <FormDescription>
                The slug is the URL-friendly version of the name. It is usually
                all lowercase and contains only letters, numbers, and hyphens.
                Leave blank or clear to auto-generate from name on blur.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief description of the VW Type..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormDescription>
                Determines the display order. Lower numbers appear first.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? initialData?.id
                ? "Saving..."
                : "Creating..."
              : initialData?.id
                ? "Save Changes"
                : "Create VW Type"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
