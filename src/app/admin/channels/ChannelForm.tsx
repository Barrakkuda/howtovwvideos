"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Channel } from "@generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addChannel, updateChannel } from "./_actions/channelActions";

const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platformChannelId: z.string().min(1, "Platform Channel ID is required"),
  url: z.string().url("Invalid URL").min(1, "URL is required"),
  thumbnailUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  subscriberCount: z.number().optional(),
  videoCount: z.number().optional(),
  description: z.string().optional(),
});

type ChannelFormData = z.infer<typeof channelSchema>;

interface ChannelFormProps {
  channel?: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelForm({ channel, open, onOpenChange }: ChannelFormProps) {
  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      platformChannelId: "",
      url: "",
      thumbnailUrl: "",
      subscriberCount: 0,
      videoCount: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (open && channel) {
      form.reset({
        name: channel.name,
        platformChannelId: channel.platformChannelId,
        url: channel.url || "",
        thumbnailUrl: channel.thumbnailUrl || "",
        subscriberCount: channel.subscriberCount || 0,
        videoCount: channel.videoCount || 0,
        description: channel.description || "",
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, channel, form]);

  const onSubmit = async (data: ChannelFormData) => {
    try {
      const result = channel
        ? await updateChannel(channel.id, data)
        : await addChannel(data);

      if (result.success) {
        toast.success(
          channel
            ? "Channel updated successfully"
            : "Channel added successfully",
        );
        onOpenChange(false);
      } else {
        toast.error(result.message || "An error occurred");
      }
    } catch (error) {
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {channel ? "Edit Channel" : "Add New Channel"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platformChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform Channel ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscriberCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscriber Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {channel ? "Save Changes" : "Add Channel"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
