"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
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
import { TagFormData, tagFormDataSchema } from "@/lib/validators/tag";
import { useCallback, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils/slugify";

interface TagFormProps {
  initialData?: Partial<TagFormData> & { id?: number };
  onSubmit: (data: TagFormData, id?: number) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

// Define a clear default structure matching the Zod schema's output for default/empty form
const defaultFormValues: TagFormData = {
  name: "",
  slug: undefined, // Corresponds to optional and transform(e => e === "" ? undefined : e)
  description: undefined, // Corresponds to .default(null)
};

export default function TagForm({
  initialData = {},
  onSubmit,
  isSubmitting = false,
  onCancel,
}: TagFormProps) {
  const [isPendingSlugGeneration, startTransitionSlugGeneration] =
    useTransition();

  // Prepare initial form values carefully, merging initialData with defaults
  const getInitialFormValues = useCallback((): TagFormData => {
    return {
      name: initialData?.name || defaultFormValues.name,
      // Slug can be an empty string from initialData if user cleared it, Zod handles it
      slug:
        initialData?.slug === ""
          ? ""
          : initialData?.slug || defaultFormValues.slug,
      description:
        initialData?.description !== undefined
          ? initialData.description
          : defaultFormValues.description,
    };
  }, [initialData]);

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormDataSchema),
    defaultValues: getInitialFormValues(),
  });

  useEffect(() => {
    // Reset form when initialData changes, ensuring correct merging with defaults
    form.reset(getInitialFormValues());
  }, [initialData, form, getInitialFormValues]); // form is stable, initialData is the key trigger

  const handleFormSubmit: SubmitHandler<TagFormData> = (data) => {
    // The data object here should be correctly typed according to TagFormData (after Zod processing)
    onSubmit(data, initialData?.id);
  };

  const generateSlugFromName = () => {
    startTransitionSlugGeneration(() => {
      const nameValue = form.getValues("name");
      if (nameValue) {
        const generatedSlug = slugify(nameValue);
        form.setValue("slug", generatedSlug, { shouldValidate: true });
        toast.info(`Slug generated: ${generatedSlug}`);
      } else {
        toast.error("Name field is empty, cannot generate slug.");
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Engine, Bodywork, Performance"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The main name of the tag. Keep it concise and descriptive.
              </FormDescription>
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
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    placeholder="e.g., engine, bodywork"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSlugFromName}
                  disabled={isSubmitting || isPendingSlugGeneration}
                  size="sm"
                >
                  Generate
                </Button>
              </div>
              <FormDescription>
                The URL-friendly version of the name. Auto-generated if left
                empty, or you can customize it (lowercase, hyphens only).
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
                  placeholder="A brief explanation of what this tag covers."
                  className="resize-y min-h-[80px]"
                  {...field}
                  value={field.value ?? ""} // Ensure value is not null for textarea
                />
              </FormControl>
              <FormDescription>
                Provide more context or details about the tag, if necessary.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || isPendingSlugGeneration}
          >
            {isSubmitting
              ? initialData?.id
                ? "Saving..."
                : "Adding..."
              : initialData?.id
                ? "Save Changes"
                : "Add Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
