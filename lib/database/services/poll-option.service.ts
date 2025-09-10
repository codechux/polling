import { createSupabaseServerClient } from '@/lib/supabase'
import type { PollOption, PollOptionInsert, PollOptionUpdate } from '../types'

export class PollOptionService {
  private static async getSupabaseClient() {
    return await createSupabaseServerClient()
  }

  static async create(optionData: PollOptionInsert): Promise<PollOption> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('poll_options')
      .insert(optionData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create poll option: ${error.message}`)
    }
    
    return data
  }

  static async createMany(optionsData: PollOptionInsert[]): Promise<PollOption[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('poll_options')
      .insert(optionsData)
      .select()
    
    if (error) {
      throw new Error(`Failed to create poll options: ${error.message}`)
    }
    
    return data
  }

  static async findByPollId(pollId: string): Promise<PollOption[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('order_index', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch poll options: ${error.message}`)
    }
    
    return data || []
  }

  static async findById(id: string): Promise<PollOption | null> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('poll_options')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch poll option: ${error.message}`)
    }
    
    return data
  }

  static async update(id: string, optionData: PollOptionUpdate): Promise<PollOption> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('poll_options')
      .update(optionData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update poll option: ${error.message}`)
    }
    
    return data
  }

  static async delete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    const { error } = await supabase
      .from('poll_options')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw new Error(`Failed to delete poll option: ${error.message}`)
    }
  }

  static async deleteByPollId(pollId: string): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    const { error } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId)
    
    if (error) {
      throw new Error(`Failed to delete poll options: ${error.message}`)
    }
  }

  static async updateMany(pollId: string, optionsData: Array<{ id?: string; text: string; order_index: number }>): Promise<PollOption[]> {
    const supabase = await this.getSupabaseClient()
    
    // First, delete existing options
    await this.deleteByPollId(pollId)
    
    // Then create new options
    const newOptionsData: PollOptionInsert[] = optionsData.map(option => ({
      poll_id: pollId,
      text: option.text,
      order_index: option.order_index
    }))
    
    return await this.createMany(newOptionsData)
  }

  static async reorderOptions(pollId: string, optionIds: string[]): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    // Update each option with its new order index
    const updates = optionIds.map((optionId, index) => 
      supabase
        .from('poll_options')
        .update({ order_index: index })
        .eq('id', optionId)
        .eq('poll_id', pollId) // Extra safety check
    )
    
    const results = await Promise.all(updates)
    
    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      throw new Error(`Failed to reorder options: ${errors[0].error?.message}`)
    }
  }

  static async getOptionWithVoteCount(optionId: string): Promise<PollOption & { vote_count: number }> {
    const supabase = await this.getSupabaseClient()
    
    // Get the option
    const option = await this.findById(optionId)
    if (!option) {
      throw new Error('Poll option not found')
    }
    
    // Get vote count
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('option_id', optionId)
    
    if (error) {
      throw new Error(`Failed to count votes: ${error.message}`)
    }
    
    return {
      ...option,
      vote_count: count || 0
    }
  }
}