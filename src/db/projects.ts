import { db } from "./index.ts";
import { projects } from "./schema.ts";
import { eq } from "drizzle-orm";

export async function getUserProjects(userUid: string) {
  try {
    return await db.select().from(projects).where(eq(projects.userUid, userUid));
  } catch (error) {
    console.error("Database getUserProjects failed:", error);
    throw new Error("Failed to fetch user projects.", { cause: error });
  }
}

export async function upsertProject(userUid: string, projectData: any) {
  try {
    const result = await db
      .insert(projects)
      .values({
        id: projectData.id,
        userUid,
        name: projectData.name || "Untitled Project",
        description: projectData.description || "",
        setting: projectData.setting || "",
        creatorNames: projectData.creatorNames || "",
        customInstructions: projectData.customInstructions || "",
        narrationStyle: projectData.narrationStyle || "",
        narrativePerspective: projectData.narrativePerspective || "third_person",
        pacing: projectData.pacing || "",
        emotionalTone: projectData.emotionalTone || "",
        canonSource: projectData.canonSource || "",
        styleGuide: projectData.styleGuide || "",
        storyModules: projectData.storyModules || "",
        userNickname: projectData.userNickname || "",
        ragSummary: projectData.ragSummary || "",
        themeId: projectData.themeId || "slate",
        settingsData: projectData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: projectData.name || "Untitled Project",
          description: projectData.description || "",
          setting: projectData.setting || "",
          creatorNames: projectData.creatorNames || "",
          customInstructions: projectData.customInstructions || "",
          narrationStyle: projectData.narrationStyle || "",
          narrativePerspective: projectData.narrativePerspective || "third_person",
          pacing: projectData.pacing || "",
          emotionalTone: projectData.emotionalTone || "",
          canonSource: projectData.canonSource || "",
          styleGuide: projectData.styleGuide || "",
          storyModules: projectData.storyModules || "",
          userNickname: projectData.userNickname || "",
          ragSummary: projectData.ragSummary || "",
          themeId: projectData.themeId || "slate",
          settingsData: projectData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsertProject failed:", error);
    throw new Error("Failed to save project to database.", { cause: error });
  }
}
