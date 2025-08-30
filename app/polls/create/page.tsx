'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "@/components/protected-route";
import Link from "next/link";
import { useState } from "react";

function CreatePollContent() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [duration, setDuration] = useState('7');
  
  const addOption = () => {
    setOptions([...options, '']);
  };
  
  const removeOption = (index:any) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };
  
  const updateOption = (index:any, value:any) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleSubmit = (e:any) => {
    e.preventDefault();
    // In a real app, this would send data to the server
    console.log({ question, options, duration });
    alert('Poll created! This is a placeholder - in a real app, this would save to the database.');
  };
  
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Poll</CardTitle>
          <CardDescription>Set up your question and options</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="question">Poll Question</Label>
                <Input 
                  id="question" 
                  placeholder="What is your favorite...?" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label>Poll Options</Label>
                <div className="grid gap-3 mt-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        placeholder={`Option ${index + 1}`} 
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        required
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        type="button"
                        onClick={() => removeOption(index)}
                      >
                        {options.length > 2 ? '×' : '+'}
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button"
                    variant="outline" 
                    className="mt-2"
                    onClick={addOption}
                  >
                    + Add Option
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="duration">Poll Duration</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <CardFooter className="flex justify-between px-0">
                <Button variant="outline" asChild>
                  <Link href="/polls">Cancel</Link>
                </Button>
                <Button type="submit">Create Poll</Button>
              </CardFooter>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreatePoll() {
  return (
    <ProtectedRoute>
      <CreatePollContent />
    </ProtectedRoute>
  );
}