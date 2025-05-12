"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { CategoryEntry, getCategoryColumns } from "./columns";
import CategoryForm from "@/components/admin/CategoryForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import {
  addCategory,
  updateCategory,
  deleteCategory,
} from "./_actions/categoryActions";
import { Category } from "@generated/prisma";
import { CategoryFormData } from "@/lib/validators/category";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryEntry | null>(
    null,
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryEntry | null>(null);

  const fetchCategories = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data: Category[] = await res.json();
      setCategories(
        data.map((c) => ({
          ...c,
          description: c.description ?? null,
        })),
      );
    } catch (err) {
      toast.error("Could not load categories.");
      console.error(err);
      setCategories([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: CategoryEntry) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (category: CategoryEntry) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      let response;
      if (editingCategory) {
        response = await updateCategory(editingCategory.id, data);
      } else {
        response = await addCategory(data);
      }

      if (response.success) {
        toast.success(response.message || "Operation successful!");
        setIsModalOpen(false);
        setEditingCategory(null);
        await fetchCategories();
      } else {
        toast.error(response.message || "An unknown error occurred.");
        if (response.errors) {
          console.error("Validation errors:", response.errors);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred while saving the category.");
    }
    setIsSubmitting(false);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await deleteCategory(categoryToDelete.id);
      if (response.success) {
        toast.success(response.message || "Category deleted successfully!");
        await fetchCategories();
      } else {
        toast.error(response.message || "Failed to delete category.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An unexpected error occurred during deletion.");
    }
    setIsSubmitting(false);
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const columns = useMemo(
    () => getCategoryColumns(handleEdit, handleDeleteRequest),
    [],
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Manage Categories</h1>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      {isFetching ? (
        <p>Loading categories...</p>
      ) : (
        <DataTable columns={columns} data={categories} />
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) {
            setIsModalOpen(false);
            setEditingCategory(null);
          } else {
            setIsModalOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? `Update the details for "${editingCategory.name}".`
                : "Fill in the details to add a new category."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            initialData={
              editingCategory
                ? {
                    ...editingCategory,
                    description: editingCategory.description ?? undefined,
                  }
                : undefined
            }
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingCategory(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              category &ldquo;<strong>{categoryToDelete?.name}</strong>&rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setCategoryToDelete(null)}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              {isSubmitting ? "Deleting..." : "Yes, delete category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
